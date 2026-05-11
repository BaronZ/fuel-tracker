/** 加油记录 */
export interface RefuelRecord {
  id: string;
  date: string;
  odometer: number;
  fuelAmount: number;
  fuelPrice: number;
  totalCost: number;
  isFullTank: boolean;
  isLowFuel: boolean;
  station: string;
  fuelType: string;
  notes: string;
  createdAt: string;
}

/** 车辆信息 */
export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  fuelType: string;
  isDefault: boolean;
  createdAt: string;
}

/** 年度数据文件 */
export interface YearData {
  vehicleId: string;
  year: number;
  records: RefuelRecord[];
}

/** 仓库配置文件 */
export interface RepoConfig {
  vehicles: Vehicle[];
  settings: AppSettings;
}

/** 应用设置 */
export interface AppSettings {
  currency: string;
  distanceUnit: string;
  fuelUnit: string;
  consumptionUnit: string;
}

/** GitHub 用户信息 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
}

/** 带油耗计算结果的记录 */
export interface RefuelRecordWithConsumption extends RefuelRecord {
  consumption: number | null; // L/100km，null 表示无法计算
}

/** 统计摘要 */
export interface StatsSummary {
  totalRefuels: number;
  totalDistance: number;
  totalCost: number;
  totalFuel: number;
  avgConsumption: number | null;
  lastConsumption: number | null;
}

/** 月度费用 */
export interface MonthlyCost {
  month: string; // "2026-01"
  cost: number;
  fuelAmount: number;
}
