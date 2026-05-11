import { create } from 'zustand';
import { getCurrentUser, checkRepoExists, createRepo, initializeRepo, getRepoConfig } from '@/api/github';
import { getToken, saveToken, clearToken } from '@/api/auth';
import type { GitHubUser, RepoConfig } from '@/types';

interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  config: RepoConfig | null;
  loading: boolean;
  initialized: boolean;

  setToken: (token: string) => void;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  loadConfig: () => Promise<void>;
  updateConfig: (config: RepoConfig) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  user: null,
  config: null,
  loading: false,
  initialized: false,

  setToken: (token: string) => {
    saveToken(token);
    set({ token });
  },

  login: async (token: string) => {
    saveToken(token);
    set({ token, loading: true });

    try {
      const user = await getCurrentUser();
      set({ user });

      // 检查并创建仓库
      const repoExists = await checkRepoExists(user.login);
      if (!repoExists) {
        await createRepo();
        // 等待仓库初始化
        await new Promise((r) => setTimeout(r, 2000));
        const config = await initializeRepo(user.login);
        set({ config, initialized: true, loading: false });
      } else {
        const config = await getRepoConfig(user.login);
        set({ config: config || null, initialized: true, loading: false });
      }
    } catch (error) {
      console.error('Login failed:', error);
      clearToken();
      set({ token: null, user: null, loading: false });
      throw error;
    }
  },

  logout: () => {
    clearToken();
    set({ token: null, user: null, config: null, initialized: false });
  },

  loadUser: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const user = await getCurrentUser();
      set({ user });
    } catch {
      clearToken();
      set({ token: null, user: null });
    }
  },

  loadConfig: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const config = await getRepoConfig(user.login);
      set({ config });
    } catch {
      // 配置读取失败，可能仓库还未初始化
    }
  },

  updateConfig: (config: RepoConfig) => {
    set({ config });
  },
}));
