import { create } from 'zustand';
import { getYearData, addRefuelRecord, updateRefuelRecord, deleteRefuelRecord } from '@/api/github';
import { calculateConsumptions } from '@/utils/consumption';
import type { RefuelRecord, RefuelRecordWithConsumption, YearData } from '@/types';

interface FuelState {
  yearData: YearData | null;
  recordsWithConsumption: RefuelRecordWithConsumption[];
  loading: boolean;

  loadYearData: (owner: string, vehicleId: string, year: number) => Promise<void>;
  loadDateRange: (owner: string, vehicleId: string, startDate: string, endDate: string) => Promise<void>;
  addRecord: (owner: string, vehicleId: string, record: RefuelRecord) => Promise<void>;
  updateRecord: (owner: string, vehicleId: string, record: RefuelRecord) => Promise<void>;
  deleteRecord: (owner: string, vehicleId: string, recordId: string) => Promise<void>;
  clearData: () => void;
}

export const useFuelStore = create<FuelState>((set, get) => ({
  yearData: null,
  recordsWithConsumption: [],
  loading: false,

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
      const startYear = parseInt(startDate.substring(0, 4));
      const endYear = parseInt(endDate.substring(0, 4));
      const allRecords: RefuelRecord[] = [];

      for (let year = startYear; year <= endYear; year++) {
        const data = await getYearData(owner, vehicleId, year);
        if (data) {
          allRecords.push(...data.records);
        }
      }

      const uniqueRecords = Array.from(
        new Map(allRecords.map((r) => [r.id, r])).values()
      )
        .filter((r) => r.date >= startDate && r.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      const withConsumption = calculateConsumptions(uniqueRecords);
      set({ yearData: null, recordsWithConsumption: withConsumption });
    } catch (error) {
      console.error('Failed to load date range:', error);
      set({ yearData: null, recordsWithConsumption: [] });
    } finally {
      set({ loading: false });
    }
  },

  addRecord: async (owner: string, vehicleId: string, record: RefuelRecord) => {
    set({ loading: true });
    try {
      await addRefuelRecord(owner, vehicleId, record);
      // 重新加载当前年份数据
      const year = parseInt(record.date.substring(0, 4));
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
        await get().loadYearData(owner, vehicleId, yearData.year);
      }
    } finally {
      set({ loading: false });
    }
  },

  clearData: () => {
    set({ yearData: null, recordsWithConsumption: [] });
  },
}));
