import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  BarChartOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import { forecastApi, Customer, BiasStats, DemandTrend } from '../services/forecast';

const { Title, Text } = Typography;

const CustomerAnalysis: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // Drawer states
  const [analysisDrawerVisible, setAnalysisDrawerVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAnalysis, setCustomerAnalysis] = useState<{
    customer: Customer;
    bias_stats: BiasStats;
    monthly_trend: DemandTrend[];
    category_breakdown: any[];
    top_products: any[];
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [searchText, typeFilter, pagination.current, pagination.pageSize]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await forecastApi.getCustomers({
        search: searchText || undefined,
        type: typeFilter,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setCustomers(data.list);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('加载客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (values: any) => {
    try {
      await forecastApi.createCustomer(values);
      message.success('客户创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadCustomers();
    } catch (error) {
      message.error('创建客户失败');
    }
  };

  const handleDeleteCustomer = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该客户吗？相关的需求历史数据也会被删除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await forecastApi.deleteCustomer(id);
          message.success('客户删除成功');
          loadCustomers();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleViewAnalysis = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setAnalysisDrawerVisible(true);
    setAnalysisLoading(true);
    try {
      const data = await forecastApi.getCustomerAnalysis(customer.id);
      setCustomerAnalysis(data);
    } catch (error) {
      message.error('加载客户分析失败');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const columns = [
    {
      title: '客户编码',
      dataIndex: 'customer_code',
      key: 'customer_code',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type_display',
      key: 'type_display',
      render: (text: string, record: Customer) => {
        const colors: Record<string, string> = {
          retail: 'blue',
          wholesale: 'green',
          distributor: 'orange',
          enterprise: 'purple',
          other: 'default',
        };
        return <Tag color={colors[record.customer_type] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      render: (text: string) => text || '-',
    },
    {
      title: '需求记录',
      dataIndex: 'demand_count',
      key: 'demand_count',
      sorter: (a: Customer, b: Customer) => a.demand_count - b.demand_count,
    },
    {
      title: '信用等级',
      dataIndex: 'credit_level',
      key: 'credit_level',
      render: (level: number) => (
        <Tag color={level >= 4 ? 'green' : level >= 3 ? 'blue' : 'orange'}>
          {level}级
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space>
          <Button
            type="link"
            icon={<BarChartOutlined />}
            onClick={() => handleViewAnalysis(record)}
          >
            分析
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCustomer(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const customerTypeOptions = [
    { value: 'retail', label: '零售客户' },
    { value: 'wholesale', label: '批发客户' },
    { value: 'distributor', label: '经销商' },
    { value: 'enterprise', label: '企业客户' },
    { value: 'other', label: '其他' },
  ];

  // Prepare chart data for analysis drawer
  const trendChartData = customerAnalysis?.monthly_trend.flatMap(item => [
    {
      period: `${item.year}-${String(item.month).padStart(2, '0')}`,
      type: '实际',
      value: item.total_actual,
    },
    {
      period: `${item.year}-${String(item.month).padStart(2, '0')}`,
      type: '预测',
      value: item.total_forecast,
    },
  ]) || [];

  const categoryPieData = customerAnalysis?.category_breakdown.map(item => ({
    category: item.category || '未分类',
    value: item.total_actual,
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>
          <UserOutlined /> 客户分析
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          添加客户
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索客户编码/名称"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="客户类型"
            style={{ width: 150 }}
            value={typeFilter}
            onChange={setTypeFilter}
            allowClear
            options={customerTypeOptions}
          />
        </Space>
      </Card>

      {/* Customer Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={customers}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }));
            },
          }}
        />
      </Card>

      {/* Create Customer Modal */}
      <Modal
        title="添加客户"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateCustomer}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_code"
                label="客户编码"
                rules={[{ required: true, message: '请输入客户编码' }]}
              >
                <Input placeholder="请输入唯一的客户编码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="客户名称"
                rules={[{ required: true, message: '请输入客户名称' }]}
              >
                <Input placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_type"
                label="客户类型"
              >
                <Select options={customerTypeOptions} placeholder="选择客户类型" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="region"
                label="区域"
              >
                <Input placeholder="请输入区域" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_person"
                label="联系人"
              >
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_phone"
                label="联系电话"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="credit_level"
                label="信用等级"
                initialValue={3}
              >
                <Select
                  options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `${n}级` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_terms"
                label="账期(天)"
                initialValue={30}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Analysis Drawer */}
      <Drawer
        title={`客户分析 - ${selectedCustomer?.name || ''}`}
        placement="right"
        width={800}
        open={analysisDrawerVisible}
        onClose={() => {
          setAnalysisDrawerVisible(false);
          setCustomerAnalysis(null);
        }}
      >
        {analysisLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>加载中...</div>
        ) : customerAnalysis ? (
          <div>
            {/* Customer Info */}
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="客户编码">
                  {customerAnalysis.customer.customer_code}
                </Descriptions.Item>
                <Descriptions.Item label="客户类型">
                  {customerAnalysis.customer.type_display}
                </Descriptions.Item>
                <Descriptions.Item label="区域">
                  {customerAnalysis.customer.region || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="信用等级">
                  {customerAnalysis.customer.credit_level}级
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Bias Stats */}
            <Card title="预测偏差分析" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="平均偏差率"
                    value={customerAnalysis.bias_stats.avg_bias_rate * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color: Math.abs(customerAnalysis.bias_stats.avg_bias_rate) > 0.15 ? '#ff4d4f' : '#52c41a',
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="MAPE"
                    value={customerAnalysis.bias_stats.mape}
                    precision={2}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="MAE"
                    value={customerAnalysis.bias_stats.mae}
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="记录数"
                    value={customerAnalysis.bias_stats.record_count}
                  />
                </Col>
              </Row>
            </Card>

            {/* Trend Chart */}
            <Card title="月度趋势" style={{ marginBottom: 16 }}>
              {trendChartData.length > 0 ? (
                <Line
                  data={trendChartData}
                  xField="period"
                  yField="value"
                  seriesField="type"
                  height={250}
                  color={['#1890ff', '#52c41a']}
                />
              ) : (
                <Empty description="暂无趋势数据" />
              )}
            </Card>

            {/* Category Breakdown */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="品类分布">
                  {categoryPieData.length > 0 ? (
                    <Pie
                      data={categoryPieData}
                      angleField="value"
                      colorField="category"
                      height={200}
                      radius={0.8}
                      label={{
                        type: 'outer',
                      }}
                    />
                  ) : (
                    <Empty description="暂无品类数据" />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="热门产品">
                  <Table
                    dataSource={customerAnalysis.top_products}
                    rowKey="product__sku"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '产品',
                        dataIndex: 'product__name',
                        key: 'name',
                        ellipsis: true,
                      },
                      {
                        title: '实际数量',
                        dataIndex: 'total_actual',
                        key: 'actual',
                        render: (val: number) => val.toLocaleString(),
                      },
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Drawer>
    </div>
  );
};

export default CustomerAnalysis;
