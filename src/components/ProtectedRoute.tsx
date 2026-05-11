import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Spin } from 'antd';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loadUser, loadConfig } = useAuthStore();
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (user) return;

    const restore = async () => {
      try {
        await loadUser();
        await loadConfig();
      } catch {
        // loadUser 内部已处理 token 失效
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
