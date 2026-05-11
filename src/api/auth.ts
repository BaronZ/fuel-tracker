const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const REDIRECT_URI = `${window.location.origin}/fuel-tracker/login`;

/** 构建 GitHub OAuth 授权 URL */
export function getOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'repo',
    response_type: 'code',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** 通过 Cloudflare Worker 用 code 换 token */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(`${WORKER_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Token exchange failed' }));
    throw new Error(error.message || 'Token exchange failed');
  }

  const data = await response.json();
  return data.access_token;
}

/** 从 URL 中提取 OAuth code */
export function extractOAuthCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

/** 存储 token */
export function saveToken(token: string): void {
  localStorage.setItem('github_token', token);
}

/** 读取 token */
export function getToken(): string | null {
  return localStorage.getItem('github_token');
}

/** 清除 token */
export function clearToken(): void {
  localStorage.removeItem('github_token');
}

/** 是否已登录 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** 发起 GitHub 登录 */
export function loginWithGitHub(): void {
  window.location.href = getOAuthUrl();
}

/** 登出 */
export function logout(): void {
  clearToken();
  window.location.href = '/fuel-tracker/login';
}
