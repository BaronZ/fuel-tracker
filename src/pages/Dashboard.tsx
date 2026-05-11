import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Table, Button, Empty, Spin, Typography, DatePicker, Space } from 'antd';
import {
  CarOutlined,
  DollarOutlined,
  DashboardOutlined,
  DashboardFilled,
  PlusOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useFuelStore } from '@/store/fuelStore';
import { calculateStats, calculateMonthlyCosts } from '@/utils/consumption';
import { formatCost, formatConsumption } from '@/utils/format';
import { useMobile } from '@/hooks/useMobile';
import type { RefuelRecordWithConsumption } from '@/types';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, config } = useAuthStore();
  const { recordsWithConsumption, loadDateRange, loading } = useFuelStore();
  const [stats, setStats] = useState<ReturnType<typeof calculateStats> | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<ReturnType<typeof calculateMonthlyCosts>>([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('year'));
  const [endDate, setEndDate] = useState(dayjs());
  const isMobile = useMobile();

  const defaultVehicle = config?.vehicles.find((v) => v.isDefault) || config?.vehicles[0];

  useEffect(() => {
    if (user?.login && defaultVehicle) {
      loadDateRange(user.login, defaultVehicle.id, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    }
  }, [user?.login, defaultVehicle?.id, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);

  useEffect(() => {
    if (recordsWithConsumption.length > 0) {
      setStats(calculateStats(recordsWithConsumption));
      setMonthlyCosts(calculateMonthlyCosts(recordsWithConsumption));
    } else {
      setStats(null);
      setMonthlyCosts([]);
    }
  }, [recordsWithConsumption]);

  const chartHeight = isMobile ? 220 : 280;

  // 快捷按钮
  const handleQuickRange = (type: 'thisYear' | 'lastYear' | 'all') => {
    const today = dayjs();
    if (type === 'thisYear') {
      setStartDate(today.startOf('year'));
      setEndDate(today);
    } else if (type === 'lastYear') {
      setStartDate(today.subtract(1, 'year'));
      setEndDate(today);
    } else {
      setStartDate(dayjs('2010-01-01'));
      setEndDate(today);
    }
  };

  const formatDateLabel = (d: string) => {
    const startYear = startDate.year();
    const endYear = endDate.year();
    if (startYear === endYear) {
      return d.substring(5); // MM-DD
    }
    return d; // YYYY-MM-DD
  };

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
        .map((r) => formatDateLabel(r.date)),
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
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: number }) => `${p.value.toFixed(1)}`,
          fontSize: 11,
          color: '#1890ff',
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
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: number }) => `¥${p.value.toFixed(0)}`,
          fontSize: 11,
          color: '#1890ff',
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
      data: recordsWithConsumption.map((r) => formatDateLabel(r.date)),
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
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: number }) => `¥${p.value.toFixed(2)}`,
          fontSize: 11,
          color: '#faad14',
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

  const renderMobileRecord = (record: RefuelRecordWithConsumption) => (
    <Card key={record.id} size="small" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>{record.date}</Text>
        <Text style={{ color: record.consumption !== null ? '#1890ff' : '#999', fontWeight: 600 }}>
          {formatConsumption(record.consumption)}
        </Text>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4, color: '#666', fontSize: 13 }}>
        <span>{record.odometer.toLocaleString()} km</span>
        <span>{record.fuelAmount}L</span>
        <span>{formatCost(record.totalCost)}</span>
      </div>
    </Card>
  );

  const rangeText = startDate.year() === endDate.year()
    ? `${startDate.year()}年`
    : `${startDate.format('YYYY-MM-DD')} 至 ${endDate.format('YYYY-MM-DD')}`;

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ marginBottom: isMobile ? 12 : 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : undefined }}>
              {defaultVehicle.name} - {rangeText}
            </Title>
          </div>
          <Space style={{ marginTop: 8, flexWrap: 'wrap' }} size={8}>
            <DatePicker
              value={startDate}
              onChange={(d) => d && setStartDate(d)}
              format="YYYY-MM-DD"
              allowClear={false}
              style={{ width: 140 }}
            />
            <span>至</span>
            <DatePicker
              value={endDate}
              onChange={(d) => d && setEndDate(d)}
              format="YYYY-MM-DD"
              allowClear={false}
              style={{ width: 140 }}
            />
            <Button size="small" onClick={() => handleQuickRange('thisYear')}>今年</Button>
            <Button size="small" onClick={() => handleQuickRange('lastYear')}>最近一年</Button>
            <Button size="small" onClick={() => handleQuickRange('all')}>全部</Button>
          </Space>
        </div>

        <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
          <Col xs={12} sm={6}>
            <Card size={isMobile ? 'small' : 'default'}>
              <Statistic
                title="加油次数"
                value={stats?.totalRefuels || 0}
                prefix={<DashboardFilled />}
                valueStyle={isMobile ? { fontSize: 20 } : undefined}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size={isMobile ? 'small' : 'default'}>
              <Statistic
                title="总里程"
                value={stats?.totalDistance || 0}
                prefix={<DashboardOutlined />}
                suffix="km"
                valueStyle={isMobile ? { fontSize: 20 } : undefined}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size={isMobile ? 'small' : 'default'}>
              <Statistic
                title="总费用"
                value={stats?.totalCost || 0}
                prefix={<DollarOutlined />}
                precision={2}
                prefixCls="¥"
                valueStyle={isMobile ? { fontSize: 20 } : undefined}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size={isMobile ? 'small' : 'default'}>
              <Statistic
                title="平均油耗"
                value={stats?.avgConsumption ?? '-'}
                prefix={<CarOutlined />}
                suffix="L/100km"
                precision={stats?.avgConsumption ? 2 : undefined}
                valueStyle={isMobile ? { fontSize: 20 } : undefined}
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
            {recordsWithConsumption.some((r) => r.consumption !== null) && (
              <Card title="油耗趋势" size={isMobile ? 'small' : 'default'} style={{ marginTop: isMobile ? 8 : 16 }}>
                <ReactECharts option={consumptionChartOption} style={{ height: chartHeight }} />
              </Card>
            )}

            {monthlyCosts.length > 0 && (
              <Card title="月度费用" size={isMobile ? 'small' : 'default'} style={{ marginTop: isMobile ? 8 : 16 }}>
                <ReactECharts option={monthlyCostChartOption} style={{ height: chartHeight }} />
              </Card>
            )}

            {recordsWithConsumption.length > 1 && (
              <Card title="油价变化" size={isMobile ? 'small' : 'default'} style={{ marginTop: isMobile ? 8 : 16 }}>
                <ReactECharts option={priceChartOption} style={{ height: chartHeight }} />
              </Card>
            )}

            <Card
              title="最近加油记录"
              size={isMobile ? 'small' : 'default'}
              style={{ marginTop: isMobile ? 8 : 16 }}
              extra={
                <Button type="link" size={isMobile ? 'small' : 'middle'} onClick={() => navigate('/refuel/list')}>
                  查看全部
                </Button>
              }
            >
              {isMobile ? (
                recentRecords.map(renderMobileRecord)
              ) : (
                <Table
                  dataSource={recentRecords}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </>
        )}
      </div>
    </Spin>
  );
}
