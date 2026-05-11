import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Select, Spin, Empty, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useAuthStore } from '@/store/authStore';
import { useFuelStore } from '@/store/fuelStore';
import { calculateStats, calculateMonthlyCosts } from '@/utils/consumption';

const { Title } = Typography;

export default function Stats() {
  const { user, config } = useAuthStore();
  const { recordsWithConsumption, loadYearData, loading } = useFuelStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<ReturnType<typeof calculateStats> | null>(null);
  const [monthlyCosts, setMonthlyCosts] = useState<ReturnType<typeof calculateMonthlyCosts>>([]);

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
    title: { text: '油耗趋势', left: 'center' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>油耗: ${p.value.toFixed(2)} L/100km`;
      },
    },
    grid: { top: 50, right: 30, bottom: 30, left: 60 },
    xAxis: {
      type: 'category' as const,
      data: recordsWithConsumption
        .filter((r) => r.consumption !== null)
        .map((r) => r.date),
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
    title: { text: '月度费用', left: 'center' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>费用: ¥${p.value.toFixed(2)}`;
      },
    },
    grid: { top: 50, right: 30, bottom: 30, left: 70 },
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
    title: { text: '油价变化', left: 'center' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>单价: ¥${p.value.toFixed(2)}/L`;
      },
    },
    grid: { top: 50, right: 30, bottom: 30, left: 60 },
    xAxis: {
      type: 'category' as const,
      data: recordsWithConsumption.map((r) => r.date),
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

  if (!defaultVehicle) {
    return <Typography.Text>请先添加车辆</Typography.Text>;
  }

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>统计分析</Title>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={yearOptions.map((y) => ({ label: `${y}年`, value: y }))}
          />
        </div>

        {/* 年度统计摘要 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="加油次数" value={stats?.totalRefuels || 0} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="总里程" value={stats?.totalDistance || 0} suffix="km" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="总费用" value={stats?.totalCost || 0} precision={2} prefix="¥" />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="平均油耗"
                value={stats?.avgConsumption ?? '-'}
                suffix="L/100km"
                precision={stats?.avgConsumption ? 2 : undefined}
              />
            </Card>
          </Col>
        </Row>

        {recordsWithConsumption.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            {/* 油耗趋势 */}
            {recordsWithConsumption.some((r) => r.consumption !== null) && (
              <Card style={{ marginBottom: 16 }}>
                <ReactECharts option={consumptionChartOption} style={{ height: 300 }} />
              </Card>
            )}

            {/* 月度费用 */}
            {monthlyCosts.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <ReactECharts option={monthlyCostChartOption} style={{ height: 300 }} />
              </Card>
            )}

            {/* 油价变化 */}
            {recordsWithConsumption.length > 1 && (
              <Card>
                <ReactECharts option={priceChartOption} style={{ height: 300 }} />
              </Card>
            )}
          </>
        )}
      </div>
    </Spin>
  );
}
