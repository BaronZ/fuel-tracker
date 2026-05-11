import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputNumber, DatePicker, Switch, Input, Select, Space, Tag, message, Typography, Card } from 'antd';
import type { SelectProps } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useFuelStore } from '@/store/fuelStore';
import { formatCost, formatConsumption } from '@/utils/format';
import { useMobile } from '@/hooks/useMobile';
import type { RefuelRecordWithConsumption, RefuelRecord } from '@/types';

const { Title, Text } = Typography;

const FUEL_TYPE_OPTIONS: SelectProps['options'] = [
  { label: '92#', value: '92#' },
  { label: '95#', value: '95#' },
  { label: '98#', value: '98#' },
  { label: '0# (柴油)', value: '0#' },
];

export default function RefuelList() {
  const navigate = useNavigate();
  const { user, config } = useAuthStore();
  const { recordsWithConsumption, loadYearData, updateRecord, deleteRecord, loading } = useFuelStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RefuelRecordWithConsumption | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editForm] = Form.useForm();
  const isMobile = useMobile();

  const defaultVehicle = config?.vehicles.find((v) => v.isDefault) || config?.vehicles[0];

  useEffect(() => {
    if (user?.login && defaultVehicle) {
      loadYearData(user.login, defaultVehicle.id, selectedYear);
    }
  }, [user?.login, defaultVehicle?.id, selectedYear]);

  const sortedRecords = [...recordsWithConsumption].sort((a, b) => b.date.localeCompare(a.date));

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleEdit = (record: RefuelRecordWithConsumption) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      date: dayjs(record.date),
      odometer: record.odometer,
      fuelAmount: record.fuelAmount,
      fuelPrice: record.fuelPrice,
      totalCost: record.totalCost,
      isFullTank: record.isFullTank,
      isLowFuel: record.isLowFuel,
      station: record.station,
      fuelType: record.fuelType,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  const handleDelete = (record: RefuelRecordWithConsumption) => {
    Modal.confirm({
      title: '确认删除',
      content: `删除 ${record.date} 的加油记录？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!user?.login || !defaultVehicle) return;
        try {
          await deleteRecord(user.login, defaultVehicle.id, record.id);
          message.success('记录已删除');
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleEditSubmit = async () => {
    if (!user?.login || !defaultVehicle || !editingRecord) return;
    try {
      const values = await editForm.validateFields();
      const updatedRecord: RefuelRecord = {
        ...editingRecord,
        date: values.date.format('YYYY-MM-DD'),
        odometer: values.odometer,
        fuelAmount: values.fuelAmount,
        fuelPrice: values.fuelPrice,
        totalCost: values.totalCost || Math.round(values.fuelAmount * values.fuelPrice * 100) / 100,
        isFullTank: values.isFullTank,
        isLowFuel: values.isLowFuel || false,
        station: values.station || '',
        fuelType: values.fuelType || '',
        notes: values.notes || '',
      };
      await updateRecord(user.login, defaultVehicle.id, updatedRecord);
      message.success('记录已更新');
      setEditModalVisible(false);
      setEditingRecord(null);
    } catch {
      message.error('更新失败');
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: (a: RefuelRecordWithConsumption, b: RefuelRecordWithConsumption) => a.date.localeCompare(b.date),
    },
    {
      title: '里程',
      dataIndex: 'odometer',
      key: 'odometer',
      width: 100,
      sorter: (a: RefuelRecordWithConsumption, b: RefuelRecordWithConsumption) => a.odometer - b.odometer,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '加油量',
      dataIndex: 'fuelAmount',
      key: 'fuelAmount',
      width: 90,
      render: (v: number) => `${v}L`,
    },
    {
      title: '金额',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      render: (v: number) => formatCost(v),
    },
    {
      title: '油耗',
      dataIndex: 'consumption',
      key: 'consumption',
      width: 120,
      render: (v: number | null) => (
        <span style={{ color: v !== null ? '#1890ff' : '#999', fontWeight: v !== null ? 600 : 400 }}>
          {formatConsumption(v)}
        </span>
      ),
    },
    {
      title: '加满',
      dataIndex: 'isFullTank',
      key: 'isFullTank',
      width: 70,
      render: (v: boolean) => v ? <Tag color="blue">加满</Tag> : <Tag>未满</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: RefuelRecordWithConsumption) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  if (!defaultVehicle) {
    return <Typography.Text>请先添加车辆</Typography.Text>;
  }

  const renderMobileRecord = (record: RefuelRecordWithConsumption) => (
    <Card key={record.id} size="small" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{record.date}</Text>
            <Text style={{ color: record.consumption !== null ? '#1890ff' : '#999', fontWeight: 600 }}>
              {formatConsumption(record.consumption)}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, color: '#666', fontSize: 13, flexWrap: 'wrap' }}>
            <span>{record.odometer.toLocaleString()} km</span>
            <span>{record.fuelAmount}L</span>
            <span>{formatCost(record.totalCost)}</span>
            {record.isFullTank && <Tag color="blue" style={{ margin: 0 }}>加满</Tag>}
          </div>
        </div>
        <Space size={4} style={{ marginLeft: 8 }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      </div>
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 8 : 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : undefined }}>加油记录</Title>
        <Space size={8}>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={yearOptions.map((y) => ({ label: `${y}年`, value: y }))}
          />
          {!isMobile && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/refuel/add')}>
              添加加油
            </Button>
          )}
        </Space>
      </div>

      {isMobile ? (
        <div>
          {sortedRecords.length === 0 ? (
            <Typography.Text type="secondary">暂无记录</Typography.Text>
          ) : (
            sortedRecords.map(renderMobileRecord)
          )}
        </div>
      ) : (
        <Table
          dataSource={sortedRecords}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 700 }}
          size="middle"
        />
      )}

      <Modal
        title="编辑加油记录"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => { setEditModalVisible(false); setEditingRecord(null); }}
        okText="保存"
        width={isMobile ? '100%' : 500}
        style={isMobile ? { top: 8, maxWidth: '100vw', margin: '0 8px' } : undefined}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="odometer" label="里程 (km)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="fuelAmount" label="加油量 (L)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="fuelPrice" label="单价 (元/L)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="totalCost" label="总金额 (元)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Space size="large" style={{ flexDirection: isMobile ? 'column' : undefined }}>
            <Form.Item name="isFullTank" label="加满" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="isLowFuel" label="油灯亮" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="fuelType" label="燃油标号">
            <Select options={FUEL_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="station" label="加油站">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
