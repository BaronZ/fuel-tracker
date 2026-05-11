import axios from 'axios';
import type { GitHubUser, YearData, RepoConfig, RefuelRecord } from '@/types';

const GITHUB_API = 'https://api.github.com';
const REPO_NAME = 'fuel-tracker-data';

function createGitHubClient(token: string) {
  const client = axios.create({
    baseURL: GITHUB_API,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  // 401 响应拦截
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('github_token');
        window.location.href = '/fuel-tracker/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

function getClient(): ReturnType<typeof createGitHubClient> {
  const token = localStorage.getItem('github_token');
  if (!token) throw new Error('Not authenticated');
  return createGitHubClient(token);
}

/** 获取当前用户信息 */
export async function getCurrentUser(): Promise<GitHubUser> {
  const client = getClient();
  const { data } = await client.get('/user');
  return data;
}

/** 检查数据仓库是否存在 */
export async function checkRepoExists(owner: string): Promise<boolean> {
  const client = getClient();
  try {
    await client.get(`/repos/${owner}/${REPO_NAME}`);
    return true;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

/** 创建数据仓库 */
export async function createRepo(): Promise<void> {
  const client = getClient();
  await client.post('/user/repos', {
    name: REPO_NAME,
    description: '油耗统计数据仓库 - Fuel Tracker',
    private: true,
    auto_init: true,
  });
}

/** 读取文件内容 */
async function getFileContent(owner: string, path: string): Promise<{ content: string; sha: string } | null> {
  const client = getClient();
  try {
    const { data } = await client.get(`/repos/${owner}/${REPO_NAME}/contents/${path}`);
    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    return { content, sha: data.sha };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/** 写入/更新文件 */
async function putFile(
  owner: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const client = getClient();
  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) {
    body.sha = sha;
  }
  await client.put(`/repos/${owner}/${REPO_NAME}/contents/${path}`, body);
}

/** 读取仓库配置 */
export async function getRepoConfig(owner: string): Promise<RepoConfig | null> {
  const file = await getFileContent(owner, 'config.json');
  if (!file) return null;
  return JSON.parse(file.content);
}

/** 保存仓库配置 */
export async function saveRepoConfig(owner: string, config: RepoConfig): Promise<void> {
  const existing = await getFileContent(owner, 'config.json');
  await putFile(owner, 'config.json', JSON.stringify(config, null, 2), '📝 更新车辆配置', existing?.sha);
}

/** 列出车辆已有数据的年份 */
export async function listVehicleYears(owner: string, vehicleId: string): Promise<number[]> {
  const client = getClient();
  try {
    const { data } = await client.get(`/repos/${owner}/${REPO_NAME}/contents/data/${vehicleId}`);
    if (!Array.isArray(data)) return [];
    const years = data
      .filter((item: { type: string; name: string }) => item.type === 'file' && /^\d{4}\.json$/.test(item.name))
      .map((item: { name: string }) => parseInt(item.name.replace('.json', ''), 10))
      .sort((a: number, b: number) => a - b);
    return years;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

/** 读取年度数据 */
export async function getYearData(owner: string, vehicleId: string, year: number): Promise<YearData | null> {
  const path = `data/${vehicleId}/${year}.json`;
  const file = await getFileContent(owner, path);
  if (!file) return null;
  return JSON.parse(file.content);
}

/** 保存年度数据 */
export async function saveYearData(
  owner: string,
  data: YearData,
  existingSha?: string
): Promise<void> {
  const path = `data/${data.vehicleId}/${data.year}.json`;
  await putFile(owner, path, JSON.stringify(data, null, 2), `📝 更新 ${data.year} 年加油记录`, existingSha);
}

/** 添加加油记录 */
export async function addRefuelRecord(
  owner: string,
  vehicleId: string,
  record: RefuelRecord
): Promise<void> {
  const year = record.date.substring(0, 4);
  const path = `data/${vehicleId}/${year}.json`;

  // 读取现有数据
  const file = await getFileContent(owner, path);
  let yearData: YearData;
  let sha: string | undefined;

  if (file) {
    yearData = JSON.parse(file.content);
    sha = file.sha;
  } else {
    yearData = { vehicleId, year: parseInt(year), records: [] };
  }

  // 追加记录并排序
  yearData.records.push(record);
  yearData.records.sort((a, b) => a.date.localeCompare(b.date));

  // 生成 commit message
  const commitMsg = `⛽ 加油: ${record.date} | ${record.fuelAmount}L | ${record.totalCost}元 | 里程${record.odometer}km`;
  await putFile(owner, path, JSON.stringify(yearData, null, 2), commitMsg, sha);
}

/** 更新加油记录 */
export async function updateRefuelRecord(
  owner: string,
  vehicleId: string,
  record: RefuelRecord
): Promise<void> {
  const year = record.date.substring(0, 4);
  const path = `data/${vehicleId}/${year}.json`;

  const file = await getFileContent(owner, path);
  if (!file) throw new Error('数据文件不存在');

  const yearData: YearData = JSON.parse(file.content);
  const idx = yearData.records.findIndex((r) => r.id === record.id);
  if (idx === -1) throw new Error('记录不存在');

  yearData.records[idx] = record;
  yearData.records.sort((a, b) => a.date.localeCompare(b.date));

  const commitMsg = `✏️ 修改加油: ${record.date} | ${record.fuelAmount}L | ${record.totalCost}元`;
  await putFile(owner, path, JSON.stringify(yearData, null, 2), commitMsg, file.sha);
}

/** 删除加油记录 */
export async function deleteRefuelRecord(
  owner: string,
  vehicleId: string,
  recordId: string
): Promise<void> {
  // 需要查找记录所在年份
  const user = await getCurrentUser();
  const config = await getRepoConfig(user.login);
  if (!config) throw new Error('配置不存在');

  // 尝试当前年份和前后各一年
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  for (const year of years) {
    const path = `data/${vehicleId}/${year}.json`;
    const file = await getFileContent(owner, path);
    if (!file) continue;

    const yearData: YearData = JSON.parse(file.content);
    const idx = yearData.records.findIndex((r) => r.id === recordId);
    if (idx === -1) continue;

    const record = yearData.records[idx];
    yearData.records.splice(idx, 1);

    const commitMsg = `🗑️ 删除加油: ${record.date} | ${record.fuelAmount}L`;
    await putFile(owner, path, JSON.stringify(yearData, null, 2), commitMsg, file.sha);
    return;
  }

  throw new Error('未找到要删除的记录');
}

/** 初始化仓库（创建默认配置） */
export async function initializeRepo(owner: string): Promise<RepoConfig> {
  const config: RepoConfig = {
    vehicles: [],
    settings: {
      currency: 'CNY',
      distanceUnit: 'km',
      fuelUnit: 'L',
      consumptionUnit: 'L/100km',
    },
  };
  await putFile(owner, 'config.json', JSON.stringify(config, null, 2), '🎉 初始化油耗追踪器');
  return config;
}

export { REPO_NAME };
