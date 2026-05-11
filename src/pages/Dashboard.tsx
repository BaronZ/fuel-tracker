import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Table, Button, Empty, Spin, Typography } from 'antd';
import {
  CarOutlined,
  DollarOutlined,
  DashboardOutlined,
  DashboardFilled,
  PlusOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAuthStore } from '@/store/authStore';
import { useFuelStore } from '@/store/fuelStore';
import { calculateStats } from '@/utils/consumption';
import { formatCost, formatConsumption } from '@/utils/format';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, config } = useAuthStore();
  const { recordsWithConsumption, loadYearData, loading } = useFuelStore();
  const [stats, setStats] = useState<ReturnType<typeof calculateStats> | null>(null);

  const defaultVehicle = config?.vehicles.find((v) => v.isDefault) || config?.vehicles[0];
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user?.login && defaultVehicle) {
      loadYearData(user.login, defaultVehicle.id, currentYear);
    }
  }, [user?.login, defaultVehicle?.id]);

  useEffect(() => {
    if (recordsWithConsumption.length > 0) {
      setStats(calculateStats(recordsWithConsumption));
    } else {
      setStats(null);
    }
  }, [recordsWithConsumption]);

  // 油耗趋势迷你图
  const miniChartOption = {
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: recordsWithConsumption
        .filter((r) => r.consumption !== null)
        .map((r) => r.date.substring(5)),
    },
    yAxis: {
      type: 'value' as const,
      name: 'L/100km',
      min: (value: { min: number }) => Math.floor(value.min - 1),
    },
    series: [
      {
        type: 'line' as const,
        data: recordsWithConsumption
          .filter((r) => r.consumption !== null)
          .map((r) => r.consumption),
        smooth: true,
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.1)' },
      },
    ],
    tooltip: { trigger: 'axis' as const },
  };

  // 最近 5 次加油
  const recentRecords = [...recordsWithConsumption]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '里程', dataIndex: 'odometer', key: 'odometer', width: 100, render: (v: number) => v.toLocaleString() },
    { title: '加油量', dataIndex: 'fuelAmount', key: 'fuelAmount', width: 90, render: (v: number) => `${v}L` },
    { title: '金额', dataIndex: 'totalCost', key: 'totalCost', width: 90, render: (v: number) => formatCost(v) },
    {
      title: '油耗',
      dataIndex: 'consumption',
      key: 'consumption',
      width: 120,
      render: (v: number | null) => formatConsumption(v),
    },
  ];

  if (!defaultVehicle) {
    return (
      <Empty
        description="还没有车辆，请先添加一辆车"
        style={{ marginTop: 100 }}
      >
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vehicles')}>
          添加车辆
        </Button>
      </Empty>
    );
  }

  return (
    <Spin spinning={loading}>
      <div>
        <Title level={4} style={{ marginBottom: 24 }}>
          {defaultVehicle.name} - {currentYear}年
        </Title>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="加油次数"
                value={stats?.totalRefuels || 0}
                prefix={<DashboardFilled />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="总里程"
                value={stats?.totalDistance || 0}
                prefix={<DashboardOutlined />}
                suffix="km"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="总费用"
                value={stats?.totalCost || 0}
                prefix={<DollarOutlined />}
                precision={2}
                prefixCls="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="平均油耗"
                value={stats?.avgConsumption ?? '-'}
                prefix={<CarOutlined />}
                suffix="L/100km"
                precision={stats?.avgConsumption ? 2 : undefined}
              />
            </Card>
          </Col>
        </Row>

        {/* 油耗趋势 */}
        {recordsWithConsumption.some((r) => r.consumption !== null) && (
          <Card title="油耗趋势" style={{ marginTop: 16 }}>
            <ReactECharts option={miniChartOption} style={{ height: 250 }} />
          </Card>
        )}

        {/* 最近加油记录 */}
        <Card
          title="最近加油记录"
          style={{ marginTop: 16 }}
          extra={
            <Button type="link" onClick={() => navigate('/refuel/list')}>
              查看全部
            </Button>
          }
        >
          {recentRecords.length > 0 ? (
            <Table
              dataSource={recentRecords}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty description="暂无加油记录">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/refuel/add')}>
                添加加油记录
              </Button>
            </Empty>
          )}
        </Card>
      </div>
    </Spin>
  );
}
