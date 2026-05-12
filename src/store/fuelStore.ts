import { create } from 'zustand';
import { getYearData, addRefuelRecord, updateRefuelRecord, deleteRefuelRecord, listVehicleYears } from '@/api/github';
import type { VehicleFileInfo } from '@/api/github';
import { calculateConsumptions } from '@/utils/consumption';
import type { RefuelRecord, RefuelRecordWithConsumption, YearData } from '@/types';

interface YearCacheEntry {
  records: RefuelRecord[];
  sha: string;
}

interface FuelState {
  yearData: YearData | null;
  recordsWithConsumption: RefuelRecordWithConsumption[];
  loading: boolean;
  availableYears: number[];

  loadYearData: (owner: string, vehicleId: string, year: number) => Promise<void>;
  loadDateRange: (owner: string, vehicleId: string, startDate: string, endDate: string) => Promise<void>;
  addRecord: (owner: string, vehicleId: string, record: RefuelRecord) => Promise<void>;
  updateRecord: (owner: string, vehicleId: string, record: RefuelRecord) => Promise<void>;
  deleteRecord: (owner: string, vehicleId: string, recordId: string) => Promise<void>;
  loadAvailableYears: (owner: string, vehicleId: string) => Promise<void>;
  clearData: () => void;
}

// localStorage 缓存读写
const cacheKey = (owner: string, vehicleId: string) => `fuel_cache_v2_${owner}_${vehicleId}`;

function loadYearCache(owner: string, vehicleId: string): Record<number, YearCacheEntry> | null {
  try {
    const raw = localStorage.getItem(cacheKey(owner, vehicleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveYearCache(owner: string, vehicleId: string, cache: Record<number, YearCacheEntry>) {
  try {
    localStorage.setItem(cacheKey(owner, vehicleId), JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save cache:', e);
  }
}

export const useFuelStore = create<FuelState>((set, get) => {
  // 内存缓存（不纳入 React state，按车辆隔离）
  let currentYearCache: Record<number, YearCacheEntry> = {};
  let currentCacheKey: string | null = null;

  function ensureCache(owner: string, vehicleId: string): Record<number, YearCacheEntry> {
    const key = `${owner}_${vehicleId}`;
    if (currentCacheKey !== key) {
      currentCacheKey = key;
      currentYearCache = loadYearCache(owner, vehicleId) || {};
    }
    return currentYearCache;
  }

  function persistCache(owner: string, vehicleId: string) {
    saveYearCache(owner, vehicleId, currentYearCache);
  }

  function invalidateYearCache(owner: string, vehicleId: string, year: number) {
    const cache = ensureCache(owner, vehicleId);
    delete cache[year];
    persistCache(owner, vehicleId);
  }

  function renderFromCache(
    cache: Record<number, YearCacheEntry>,
    targetYears: number[],
    startDate: string,
    endDate: string
  ): RefuelRecordWithConsumption[] | null {
    const allRecords: RefuelRecord[] = [];
    for (const year of targetYears) {
      if (cache[year]) {
        allRecords.push(...cache[year].records);
      }
    }
    if (allRecords.length === 0) return null;
    const filtered = Array.from(new Map(allRecords.map((r) => [r.id, r])).values())
      .filter((r) => r.date >= startDate && r.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    return calculateConsumptions(filtered);
  }

  return {
    yearData: null,
    recordsWithConsumption: [],
    loading: false,
    availableYears: [],

    loadYearData: async (owner: string, vehicleId: string, year: number) => {
      set({ loading: true });
      try {
        const data = await getYearData(owner, vehicleId, year);
        if (data) {
          const withConsumption = calculateConsumptions(data.records);
          set({ yearData: data, recordsWithConsumption: withConsumption });
        } else {
          set({ yearData: null, recordsWithConsumption: [] });
        }
      } catch (error) {
        console.error('Failed to load year data:', error);
        set({ yearData: null, recordsWithConsumption: [] });
      } finally {
        set({ loading: false });
      }
    },

    loadDateRange: async (owner: string, vehicleId: string, startDate: string, endDate: string) => {
      set({ loading: true });
      try {
        const cache = ensureCache(owner, vehicleId);

        // 1. 获取远程目录列表（含 SHA）
        const remoteFiles = await listVehicleYears(owner, vehicleId);

        // 2. 确定目标年份
        const startYear = parseInt(startDate.substring(0, 4));
        const endYear = parseInt(endDate.substring(0, 4));
        const targetYears = remoteFiles
          .map((f) => f.year)
          .filter((y) => y >= startYear && y <= endYear);

        // 3. 标记需要请求的年份
        const yearsToFetch: number[] = [];
        for (const year of targetYears) {
          const remote = remoteFiles.find((f) => f.year === year);
          const local = cache[year];
          if (!local || !remote || local.sha !== remote.sha) {
            yearsToFetch.push(year);
          }
        }

        // 4. 先用缓存数据渲染（SWR，避免白屏）
        const cachedRecords = renderFromCache(cache, targetYears, startDate, endDate);
        if (cachedRecords) {
          set({ recordsWithConsumption: cachedRecords });
        }

        // 5. 并行请求需要更新的年份
        if (yearsToFetch.length > 0) {
          await Promise.all(
            yearsToFetch.map(async (year) => {
              const data = await getYearData(owner, vehicleId, year);
              const remote = remoteFiles.find((f) => f.year === year);
              if (data && remote) {
                cache[year] = { records: data.records, sha: remote.sha };
              }
            })
          );

          // 6. 合并并更新
          const merged = renderFromCache(cache, targetYears, startDate, endDate);
          set({ recordsWithConsumption: merged || [] });
          persistCache(owner, vehicleId);
        }
      } catch (error) {
        console.error('Failed to load date range:', error);
        set({ recordsWithConsumption: [] });
      } finally {
        set({ loading: false });
      }
    },

    addRecord: async (owner: string, vehicleId: string, record: RefuelRecord) => {
      set({ loading: true });
      try {
        await addRefuelRecord(owner, vehicleId, record);
        const year = parseInt(record.date.substring(0, 4));
        invalidateYearCache(owner, vehicleId, year);
        await get().loadYearData(owner, vehicleId, year);
      } finally {
        set({ loading: false });
      }
    },

    updateRecord: async (owner: string, vehicleId: string, record: RefuelRecord) => {
      set({ loading: true });
      try {
        await updateRefuelRecord(owner, vehicleId, record);
        const { yearData } = get();
        const year = parseInt(record.date.substring(0, 4));
        invalidateYearCache(owner, vehicleId, year);
        await get().loadYearData(owner, vehicleId, yearData?.year || year);
      } finally {
        set({ loading: false });
      }
    },

    deleteRecord: async (owner: string, vehicleId: string, recordId: string) => {
      set({ loading: true });
      try {
        await deleteRefuelRecord(owner, vehicleId, recordId);
        const { yearData } = get();
        if (yearData) {
          invalidateYearCache(owner, vehicleId, yearData.year);
          await get().loadYearData(owner, vehicleId, yearData.year);
        }
      } finally {
        set({ loading: false });
      }
    },

    loadAvailableYears: async (owner: string, vehicleId: string) => {
      try {
        const files: VehicleFileInfo[] = await listVehicleYears(owner, vehicleId);
        set({ availableYears: files.map((f) => f.year) });
      } catch (error) {
        console.error('Failed to load available years:', error);
        set({ availableYears: [] });
      }
    },

    clearData: () => {
      currentYearCache = {};
      currentCacheKey = null;
      set({ yearData: null, recordsWithConsumption: [], availableYears: [] });
    },
  };
});
