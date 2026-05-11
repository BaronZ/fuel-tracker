import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, InputNumber, DatePicker, Switch, Input, Select, Button, Card, message, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/store/authStore';
import { useFuelStore } from '@/store/fuelStore';
import type { RefuelRecord } from '@/types';

const { Title } = Typography;
const { TextArea } = Input;

const FUEL_TYPE_OPTIONS = [
  { label: '92#', value: '92#' },
  { label: '95#', value: '95#' },
  { label: '98#', value: '98#' },
  { label: '0# (柴油)', value: '0#' },
];

interface FormValues {
  date: dayjs.Dayjs;
  odometer: number;
  fuelAmount: number;
  fuelPrice: number;
  totalCost?: number;
  isFullTank: boolean;
  isLowFuel: boolean;
  station?: string;
  fuelType?: string;
  notes?: string;
}

export default function AddRefuel() {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [manualCost, setManualCost] = useState(false);
  const { user, config } = useAuthStore();
  const { addRecord, recordsWithConsumption } = useFuelStore();

  const defaultVehicle = config?.vehicles.find((v) => v.isDefault) || config?.vehicles[0];

  // 默认值
  useEffect(() => {
    if (recordsWithConsumption.length > 0) {
      form.setFieldsValue({
        odometer: undefined, // 不自动填，让用户输入
        fuelType: defaultVehicle?.fuelType || '92#',
        isFullTank: true,
        isLowFuel: false,
      });
    } else {
      form.setFieldsValue({
        date: dayjs(),
        isFullTank: true,
        isLowFuel: false,
        fuelType: defaultVehicle?.fuelType || '92#',
      });
    }
  }, [recordsWithConsumption, defaultVehicle]);

  // 自动计算总金额
  const fuelAmount = Form.useWatch('fuelAmount', form);
  const fuelPrice = Form.useWatch('fuelPrice', form);

  useEffect(() => {
    if (!manualCost && fuelAmount && fuelPrice) {
      form.setFieldValue('totalCost', Math.round(fuelAmount * fuelPrice * 100) / 100);
    }
  }, [fuelAmount, fuelPrice, manualCost, form]);

  const onFinish = async (values: FormValues) => {
    if (!user?.login || !defaultVehicle) {
      message.error('请先登录并添加车辆');
      return;
    }

    setSubmitting(true);
    try {
      const totalCost = values.totalCost || Math.round(values.fuelAmount * values.fuelPrice * 100) / 100;

      const record: RefuelRecord = {
        id: uuidv4(),
        date: values.date.format('YYYY-MM-DD'),
        odometer: values.odometer,
        fuelAmount: values.fuelAmount,
        fuelPrice: values.fuelPrice,
        totalCost,
        isFullTank: values.isFullTank,
        isLowFuel: values.isLowFuel || false,
        station: values.station || '',
        fuelType: values.fuelType || defaultVehicle.fuelType || '92#',
        notes: values.notes || '',
        createdAt: new Date().toISOString(),
      };

      await addRecord(user.login, defaultVehicle.id, record);
      message.success('加油记录已保存');
      navigate('/stats');
    } catch (error) {
      console.error('Failed to save record:', error);
      message.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!defaultVehicle) {
    return (
      <Card>
        <Typography.Text>请先添加一辆车辆</Typography.Text>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={4}>添加加油记录</Title>
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
            isFullTank: true,
            isLowFuel: false,
            fuelType: defaultVehicle?.fuelType || '92#',
          }}
        >
          <Form.Item name="date" label="加油日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="odometer" label="里程表读数 (km)" rules={[{ required: true, message: '请输入里程' }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={0}
              placeholder="当前里程表读数"
            />
          </Form.Item>

          <Form.Item name="fuelAmount" label="加油量 (L)" rules={[{ required: true, message: '请输入加油量' }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="加油升数"
            />
          </Form.Item>

          <Form.Item name="fuelPrice" label="单价 (元/L)" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="每升油价"
            />
          </Form.Item>

          <Form.Item name="totalCost" label="总金额 (元)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="自动计算，也可手动输入"
              onChange={() => setManualCost(true)}
            />
          </Form.Item>

          <Space size="large" style={{ marginBottom: 24 }}>
            <Form.Item name="isFullTank" label="是否加满" valuePropName="checked">
              <Switch checkedChildren="加满" unCheckedChildren="未满" />
            </Form.Item>
            <Form.Item name="isLowFuel" label="油灯亮" valuePropName="checked">
              <Switch checkedChildren="亮" unCheckedChildren="未亮" />
            </Form.Item>
          </Space>

          <Form.Item name="fuelType" label="燃油标号">
            <Select options={FUEL_TYPE_OPTIONS} placeholder="选择燃油标号" />
          </Form.Item>

          <Form.Item name="station" label="加油站">
            <Input placeholder="加油站名称（选填）" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="备注信息（选填）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} size="large">
                保存记录
              </Button>
              <Button onClick={() => navigate(-1)} size="large">
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
