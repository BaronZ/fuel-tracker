import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message, Typography, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/store/authStore';
import { saveRepoConfig } from '@/api/github';
import type { Vehicle } from '@/types';

const { Title } = Typography;

const FUEL_TYPE_OPTIONS = [
  { label: '92#', value: '92#' },
  { label: '95#', value: '95#' },
  { label: '98#', value: '98#' },
  { label: '0# (柴油)', value: '0#' },
];

export default function Vehicles() {
  const { user, config, updateConfig } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const vehicles = config?.vehicles || [];

  const openAddModal = () => {
    setEditingVehicle(null);
    form.resetFields();
    form.setFieldsValue({ fuelType: '92#' });
    setModalVisible(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    form.setFieldsValue({
      name: vehicle.name,
      brand: vehicle.brand,
      model: vehicle.model,
      fuelType: vehicle.fuelType,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!user?.login || !config) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let newVehicles: Vehicle[];
      if (editingVehicle) {
        // 编辑
        newVehicles = config.vehicles.map((v) =>
          v.id === editingVehicle.id
            ? { ...v, ...values }
            : v
        );
      } else {
        // 新增
        const newVehicle: Vehicle = {
          id: uuidv4(),
          ...values,
          isDefault: config.vehicles.length === 0, // 第一辆车默认
          createdAt: new Date().toISOString(),
        };
        newVehicles = [...config.vehicles, newVehicle];
      }

      const newConfig = { ...config, vehicles: newVehicles };
      await saveRepoConfig(user.login, newConfig);
      updateConfig(newConfig);
      message.success(editingVehicle ? '车辆已更新' : '车辆已添加');
      setModalVisible(false);
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!user?.login || !config) return;

    if (config.vehicles.length <= 1) {
      message.warning('至少保留一辆车辆');
      return;
    }

    try {
      const newVehicles = config.vehicles.filter((v) => v.id !== vehicleId);
      // 如果删除的是默认车辆，设置第一辆车为默认
      if (!newVehicles.some((v) => v.isDefault) && newVehicles.length > 0) {
        newVehicles[0].isDefault = true;
      }

      const newConfig = { ...config, vehicles: newVehicles };
      await saveRepoConfig(user.login, newConfig);
      updateConfig(newConfig);
      message.success('车辆已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const setDefault = async (vehicleId: string) => {
    if (!user?.login || !config) return;

    try {
      const newVehicles = config.vehicles.map((v) => ({
        ...v,
        isDefault: v.id === vehicleId,
      }));
      const newConfig = { ...config, vehicles: newVehicles };
      await saveRepoConfig(user.login, newConfig);
      updateConfig(newConfig);
      message.success('已设为默认车辆');
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '车辆名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Vehicle) => (
        <Space>
          <span>{name}</span>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '燃油标号',
      dataIndex: 'fuelType',
      key: 'fuelType',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Vehicle) => (
        <Space>
          <Button
            type="text"
            icon={record.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={() => !record.isDefault && setDefault(record.id)}
            disabled={record.isDefault}
          >
            {record.isDefault ? '默认' : '设为默认'}
          </Button>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm title="确认删除此车辆？" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>车辆管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          添加车辆
        </Button>
      </div>

      <Table
        dataSource={vehicles}
        columns={columns}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingVehicle ? '编辑车辆' : '添加车辆'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="车辆名称" rules={[{ required: true, message: '请输入车辆名称' }]}>
            <Input placeholder="如：我的小白" />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input placeholder="如：Toyota" />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input placeholder="如：Camry" />
          </Form.Item>
          <Form.Item name="fuelType" label="默认燃油标号">
            <Select options={FUEL_TYPE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
