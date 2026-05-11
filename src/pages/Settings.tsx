import { Card, Descriptions, Button, Typography, message, Modal, Space } from 'antd';
import { LogoutOutlined, GithubOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { logout as authLogout } from '@/api/auth';
import { REPO_NAME } from '@/api/github';

const { Title, Text, Paragraph } = Typography;

export default function Settings() {
  const { user, config } = useAuthStore();

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      content: '退出后需要重新登录才能使用',
      okText: '退出',
      okType: 'danger',
      onOk: () => {
        authLogout();
        useAuthStore.getState().logout();
      },
    });
  };

  const handleClearCache = () => {
    Modal.confirm({
      title: '清除本地缓存？',
      content: '仅清除浏览器缓存，不会删除 GitHub 上的数据',
      okText: '清除',
      onOk: () => {
        localStorage.clear();
        message.success('缓存已清除，即将重新登录');
        setTimeout(() => authLogout(), 1000);
      },
    });
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <Title level={4}>设置</Title>

      {/* 用户信息 */}
      <Card title="账户信息" style={{ marginBottom: 16 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="用户名">{user?.login}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="GitHub">
            <a href={`https://github.com/${user?.login}`} target="_blank" rel="noopener noreferrer">
              <GithubOutlined /> {user?.login}
            </a>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 数据仓库 */}
      <Card title="数据仓库" style={{ marginBottom: 16 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="仓库名称">{REPO_NAME}</Descriptions.Item>
          <Descriptions.Item label="仓库地址">
            <a
              href={`https://github.com/${user?.login}/${REPO_NAME}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {user?.login}/{REPO_NAME}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="存储方式">
            <Text type="secondary">数据以 JSON 文件存储在您的 GitHub 私有仓库中</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 单位设置 */}
      <Card title="单位设置" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="货币">{config?.settings.currency || 'CNY'}</Descriptions.Item>
          <Descriptions.Item label="距离单位">{config?.settings.distanceUnit || 'km'}</Descriptions.Item>
          <Descriptions.Item label="油量单位">{config?.settings.fuelUnit || 'L'}</Descriptions.Item>
          <Descriptions.Item label="油耗单位">{config?.settings.consumptionUnit || 'L/100km'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 操作 */}
      <Card title="操作">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Button icon={<DeleteOutlined />} onClick={handleClearCache}>
              清除本地缓存
            </Button>
            <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12 }}>
              清除浏览器缓存数据，不会影响 GitHub 上的实际数据
            </Paragraph>
          </div>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout} block>
            退出登录
          </Button>
        </Space>
      </Card>
    </div>
  );
}
