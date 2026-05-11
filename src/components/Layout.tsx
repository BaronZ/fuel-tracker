import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  CarOutlined,
  SettingOutlined,
  LogoutOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { logout as authLogout } from '@/api/auth';
import { useMobile } from '@/hooks/useMobile';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/refuel/add', icon: <PlusCircleOutlined />, label: '添加加油' },
  { key: '/refuel/list', icon: <UnorderedListOutlined />, label: '加油记录' },
  { key: '/vehicles', icon: <CarOutlined />, label: '车辆管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isMobile = useMobile();

  const handleLogout = () => {
    authLogout();
    useAuthStore.getState().logout();
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 移动端：底部 TabBar 布局
  if (isMobile) {
    return (
      <AntLayout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 12, paddingBottom: 60, overflow: 'auto' }}>
          <Outlet />
        </Content>
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: 56,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: 100,
          }}
        >
          {menuItems.map((item) => {
            const isActive = location.pathname === item.key;
            return (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  cursor: 'pointer',
                  color: isActive ? '#1890ff' : '#999',
                  fontSize: 10,
                  gap: 2,
                  transition: 'color 0.2s',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </AntLayout>
    );
  }

  // 桌面端：侧边栏布局
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="light"
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Typography.Text strong style={{ fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? '⛽' : '⛽ 油耗追踪'}
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar src={user?.avatar_url} icon={<GithubOutlined />} size="small" />
              <span>{user?.name || user?.login}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
