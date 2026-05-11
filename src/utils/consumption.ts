import type { RefuelRecord, RefuelRecordWithConsumption, StatsSummary, MonthlyCost } from '@/types';

/**
 * 加满法油耗计算
 * 规则：
 * - 至少需要两次加满记录才能计算油耗
 * - 两次加满之间，所有未加满记录的加油量累加
 * - 油耗 = 累计加油量 / 里程差 × 100
 */
export function calculateConsumptions(records: RefuelRecord[]): RefuelRecordWithConsumption[] {
  const sorted = [...records].sort((a, b) => a.odometer - b.odometer);
  const result: RefuelRecordWithConsumption[] = sorted.map((r) => ({
    ...r,
    consumption: null,
  }));

  // 找到所有加满点
  const fullTankIndices: number[] = [];
  sorted.forEach((r, i) => {
    if (r.isFullTank) {
      fullTankIndices.push(i);
    }
  });

  // 计算每两个连续加满点之间的油耗
  for (let i = 0; i < fullTankIndices.length - 1; i++) {
    const startIdx = fullTankIndices[i];
    const endIdx = fullTankIndices[i + 1];

    // 累计加油量：从 startIdx+1 到 endIdx 的所有加油量之和
    let totalFuel = 0;
    for (let j = startIdx + 1; j <= endIdx; j++) {
      totalFuel += sorted[j].fuelAmount;
    }

    const distance = sorted[endIdx].odometer - sorted[startIdx].odometer;

    if (distance > 0) {
      const consumption = (totalFuel / distance) * 100;
      // 油耗标记在区间结束的加满记录上
      result[endIdx].consumption = Math.round(consumption * 100) / 100;
    }
  }

  return result;
}

/**
 * 计算统计摘要
 */
export function calculateStats(records: RefuelRecordWithConsumption[]): StatsSummary {
  if (records.length === 0) {
    return {
      totalRefuels: 0,
      totalDistance: 0,
      totalCost: 0,
      totalFuel: 0,
      avgConsumption: null,
      lastConsumption: null,
    };
  }

  const sorted = [...records].sort((a, b) => a.odometer - b.odometer);
  const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);
  const totalFuel = records.reduce((sum, r) => sum + r.fuelAmount, 0);
  const totalDistance = sorted[sorted.length - 1].odometer - sorted[0].odometer;

  // 所有可计算的油耗
  const consumptions = records
    .filter((r) => r.consumption !== null)
    .map((r) => r.consumption!);

  const avgConsumption =
    consumptions.length > 0
      ? Math.round((consumptions.reduce((s, c) => s + c, 0) / consumptions.length) * 100) / 100
      : null;

  const lastConsumption =
    consumptions.length > 0 ? consumptions[consumptions.length - 1] : null;

  return {
    totalRefuels: records.length,
    totalDistance,
    totalCost: Math.round(totalCost * 100) / 100,
    totalFuel: Math.round(totalFuel * 100) / 100,
    avgConsumption,
    lastConsumption,
  };
}

/**
 * 计算月度费用统计
 */
export function calculateMonthlyCosts(records: RefuelRecord[]): MonthlyCost[] {
  const monthMap = new Map<string, { cost: number; fuelAmount: number }>();

  records.forEach((r) => {
    const month = r.date.substring(0, 7); // "2026-01"
    const existing = monthMap.get(month) || { cost: 0, fuelAmount: 0 };
    existing.cost += r.totalCost;
    existing.fuelAmount += r.fuelAmount;
    monthMap.set(month, existing);
  });

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      cost: Math.round(data.cost * 100) / 100,
      fuelAmount: Math.round(data.fuelAmount * 100) / 100,
    }));
}
