import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';

// 全局 axios 拦截器
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        localStorage.removeItem('github_token');
        // 避免在登录页循环跳转
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/fuel-tracker/login';
        }
      } else if (status === 403) {
        console.error('API rate limit exceeded');
      } else if (status === 409) {
        // GitHub Contents API sha 冲突
        console.error('Concurrent modification detected, please refresh and retry');
      } else if (!error.response) {
        console.error('Network error');
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
