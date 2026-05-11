import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Table, Button, Empty, Spin, Typography, Select } from 'antd';
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
import { calculateStats, calculateMonthlyCosts } from '@/utils/consumption';
import { formatCost, formatConsumption } from '@/utils/format';

const { Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, config } = useAuthStore();
  const { recordsWithConsumption, loadYearData, loading } = useFuelStore();
  const [stats, setStats] = useState<ReturnType<typeof calculateStats> | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<ReturnType<typeof calculateMonthlyCosts>>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const defaultVehicle = config?.vehicles.find((v) => v.isDefault) || config?.vehicles[0];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (user?.login && defaultVehicle) {
      loadYearData(user.login, defaultVehicle.id, selectedYear);
    }
  }, [user?.login, defaultVehicle?.id, selectedYear]);

  useEffect(() => {
    if (recordsWithConsumption.length > 0) {
      setStats(calculateStats(recordsWithConsumption));
      setMonthlyCosts(calculateMonthlyCosts(recordsWithConsumption));
    } else {
      setStats(null);
      setMonthlyCosts([]);
    }
  }, [recordsWithConsumption]);

  // 油耗趋势折线图
  const consumptionChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>油耗: ${p.value.toFixed(2)} L/100km`;
      },
    },
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
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
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24,144,255,0.3)' },
              { offset: 1, color: 'rgba(24,144,255,0.02)' },
            ],
          },
        },
        markLine: stats?.avgConsumption
          ? {
              data: [{ yAxis: stats.avgConsumption, name: '平均' }],
              lineStyle: { color: '#ff4d4f', type: 'dashed' as const },
              label: { formatter: `平均 ${stats.avgConsumption.toFixed(2)}` },
            }
          : undefined,
      },
    ],
  };

  // 月度费用柱状图
  const monthlyCostChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>费用: ¥${p.value.toFixed(2)}`;
      },
    },
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: 'category' as const,
      data: monthlyCosts.map((m) => m.month),
    },
    yAxis: {
      type: 'value' as const,
      name: '元',
    },
    series: [
      {
        type: 'bar' as const,
        data: monthlyCosts.map((m) => m.cost),
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  // 油价变化趋势
  const priceChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>单价: ¥${p.value.toFixed(2)}/L`;
      },
    },
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category' as const,
      data: recordsWithConsumption.map((r) => r.date.substring(5)),
    },
    yAxis: {
      type: 'value' as const,
      name: '元/L',
      min: (value: { min: number }) => Math.floor(value.min * 10 - 1) / 10,
    },
    series: [
      {
        type: 'line' as const,
        data: recordsWithConsumption.map((r) => r.fuelPrice),
        smooth: true,
        itemStyle: { color: '#faad14' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(250,173,20,0.3)' },
              { offset: 1, color: 'rgba(250,173,20,0.02)' },
            ],
          },
        },
      },
    ],
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={4} style={{ margin: 0 }}>
            {defaultVehicle.name} - {selectedYear}年
          </Title>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={yearOptions.map((y) => ({ label: `${y}年`, value: y }))}
          />
        </div>

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

        {recordsWithConsumption.length === 0 ? (
          <Empty description="暂无加油记录" style={{ marginTop: 40 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/refuel/add')}>
              添加加油记录
            </Button>
          </Empty>
        ) : (
          <>
            {/* 油耗趋势 */}
            {recordsWithConsumption.some((r) => r.consumption !== null) && (
              <Card title="油耗趋势" style={{ marginTop: 16 }}>
                <ReactECharts option={consumptionChartOption} style={{ height: 280 }} />
              </Card>
            )}

            {/* 月度费用 */}
            {monthlyCosts.length > 0 && (
              <Card title="月度费用" style={{ marginTop: 16 }}>
                <ReactECharts option={monthlyCostChartOption} style={{ height: 280 }} />
              </Card>
            )}

            {/* 油价变化 */}
            {recordsWithConsumption.length > 1 && (
              <Card title="油价变化" style={{ marginTop: 16 }}>
                <ReactECharts option={priceChartOption} style={{ height: 280 }} />
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
              <Table
                dataSource={recentRecords}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </>
        )}
      </div>
    </Spin>
  );
}
