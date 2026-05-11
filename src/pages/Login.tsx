import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result, Spin, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { extractOAuthCode, exchangeCodeForToken, isAuthenticated, loginWithGitHub } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    // 已登录则跳转
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // 检查 OAuth 回调
    const code = extractOAuthCode();
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  async function handleOAuthCallback(code: string) {
    setLoading(true);
    setError(null);
    try {
      const token = await exchangeCodeForToken(code);
      await login(token);
      // 清除 URL 中的 code 参数
      window.history.replaceState({}, '', '/fuel-tracker/login');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('OAuth callback failed:', err);
      setError('登录失败，请重试');
      window.history.replaceState({}, '', '/fuel-tracker/login');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="正在登录..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Result status="error" title="登录失败" subTitle={error} extra={<Button onClick={() => setError(null)}>重试</Button>} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          maxWidth: 400,
          width: '90%',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>⛽</div>
        <Title level={2} style={{ marginBottom: 8 }}>
          油耗追踪器
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
          记录每一次加油，掌握真实油耗
        </Text>
        <Button
          type="primary"
          size="large"
          icon={<GithubOutlined />}
          onClick={loginWithGitHub}
          style={{
            width: '100%',
            height: 48,
            fontSize: 16,
            borderRadius: 8,
          }}
        >
          使用 GitHub 登录
        </Button>
        <div style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            数据存储在你的 GitHub 私有仓库中，安全可控
          </Text>
        </div>
      </div>
    </div>
  );
}
