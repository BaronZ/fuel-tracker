import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  CarOutlined,
  SettingOutlined,
  LogoutOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { logout as authLogout } from '@/api/auth';

const { Header, Sider, Content } = AntLayout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/refuel/add', icon: <PlusCircleOutlined />, label: '添加加油' },
  { key: '/refuel/list', icon: <UnorderedListOutlined />, label: '加油记录' },
  { key: '/stats', icon: <BarChartOutlined />, label: '统计分析' },
  { key: '/vehicles', icon: <CarOutlined />, label: '车辆管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

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
