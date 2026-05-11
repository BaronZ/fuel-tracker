import dayjs from 'dayjs';

/** 格式化日期 */
export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/** 格式化金额 */
export function formatCost(cost: number): string {
  return `¥${cost.toFixed(2)}`;
}

/** 格式化里程 */
export function formatOdometer(odometer: number): string {
  return `${odometer.toLocaleString()} km`;
}

/** 格式化油耗 */
export function formatConsumption(consumption: number | null): string {
  if (consumption === null) return '-';
  return `${consumption.toFixed(2)} L/100km`;
}

/** 格式化油量 */
export function formatFuel(amount: number): string {
  return `${amount.toFixed(2)} L`;
}

/** 格式化油价 */
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}/L`;
}
