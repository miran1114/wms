import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  InputNumber,
  Select,
  Button,
  Typography,
  Slider,
  Statistic,
  Divider,
  Space,
  Table,
  message,
  Spin,
  Empty,
  Alert,
  Tooltip,
} from 'antd';
import {
  ExperimentOutlined,
  SafetyOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { forecastApi, Customer, SimulationResult as APISimulationResult } from '../services/forecast';

const { Title, Text, Paragraph } = Typography;

interface PolicyResult {
  safety_stock: number;
  reorder_point: number;
  demand_std: number;
  service_level: number;
  z_score: number;
  predicted_actual: number;
  adjustment_factor: number;
  reliability: string;
}

interface LocalSimulationItem {
  service_level: number;
  z_score: number;
  safety_stock: number;
  reorder_point: number;
  holding_cost: number;
  stockout_cost: number;
  total_cost: number;
}

interface LocalSimulationResult {
  results: LocalSimulationItem[];
  optimal_result: LocalSimulationItem;
}

const PolicySandbox: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const [form] = Form.useForm();
  const [policyResult, setPolicyResult] = useState<PolicyResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<LocalSimulationResult | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await forecastApi.getCustomers({ pageSize: 1000 });
      setCustomers(data.list);
    } catch (error) {
      message.error('加载客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePolicy = async () => {
    try {
      const values = await form.validateFields();
      setCalculating(true);
      
      const result = await forecastApi.calculatePolicy({
        customer_id: values.customer_id,
        product_id: values.product_id || 1, // Default product ID
        lead_time_days: values.lead_time,
        service_level: values.service_level / 100,
      });
      
      // Map result to our policy display format
      setPolicyResult({
        safety_stock: result.safety_stock,
        reorder_point: result.reorder_point,
        demand_std: result.daily_std_dev,
        service_level: values.service_level / 100,
        z_score: result.z_score,
        predicted_actual: result.daily_demand * values.lead_time,
        adjustment_factor: 1.0,
        reliability: 'medium',
      });
      setSimulationResult(null); // Clear previous simulation
      message.success('策略计算完成');
    } catch (error: any) {
      if (error.message) {
        message.error(error.message);
      } else {
        message.error('计算失败，请检查输入参数');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleSimulation = async () => {
    try {
      const values = await form.validateFields();
      setSimulating(true);

      const result = await forecastApi.simulateServiceLevel({
        customer_id: values.customer_id,
        product_id: values.product_id || 1, // Default product ID
        lead_time_days: values.lead_time,
        holding_cost_per_unit: values.unit_cost * (values.holding_cost_rate / 100),
        service_levels: [0.85, 0.90, 0.95, 0.98, 0.99],
      });

      // Map simulation results
      const mappedResults = result.simulation.map(s => ({
        service_level: s.service_level,
        z_score: s.service_level_pct, // Approximate Z-score display
        safety_stock: s.safety_stock,
        reorder_point: s.reorder_point,
        holding_cost: s.holding_cost,
        stockout_cost: s.stockout_risk * values.stockout_cost,
        total_cost: s.holding_cost + (s.stockout_risk * values.stockout_cost),
      }));

      // Find optimal (lowest total cost)
      const optimal = mappedResults.reduce((min, r) => r.total_cost < min.total_cost ? r : min, mappedResults[0]);

      setSimulationResult({
        results: mappedResults,
        optimal_result: optimal,
      });
      message.success('模拟完成');
    } catch (error) {
      message.error('模拟失败');
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setPolicyResult(null);
    setSimulationResult(null);
  };

  // Prepare simulation chart data
  const simulationChartData = simulationResult?.results.flatMap(item => [
    {
      serviceLevel: `${(item.service_level * 100).toFixed(0)}%`,
      type: '安全库存',
      value: item.safety_stock,
    },
  ]) || [];

  const costChartData = simulationResult?.results.map(item => ({
    serviceLevel: `${(item.service_level * 100).toFixed(0)}%`,
    totalCost: item.total_cost,
  })) || [];

  const simulationColumns = [
    {
      title: '服务水平',
      dataIndex: 'service_level',
      key: 'service_level',
      render: (val: number) => (
        <Text strong>{(val * 100).toFixed(0)}%</Text>
      ),
    },
    {
      title: 'Z-Score',
      dataIndex: 'z_score',
      key: 'z_score',
      render: (val: number) => val.toFixed(3),
    },
    {
      title: '安全库存',
      dataIndex: 'safety_stock',
      key: 'safety_stock',
      render: (val: number) => (
        <Text type="warning">{val.toLocaleString()}</Text>
      ),
    },
    {
      title: '再订货点',
      dataIndex: 'reorder_point',
      key: 'reorder_point',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '持有成本',
      dataIndex: 'holding_cost',
      key: 'holding_cost',
      render: (val: number) => `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: '缺货成本',
      dataIndex: 'stockout_cost',
      key: 'stockout_cost',
      render: (val: number) => `¥${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      title: '总成本',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (val: number, record: any) => (
        <Text
          style={{
            color: record === simulationResult?.optimal_result ? '#52c41a' : undefined,
            fontWeight: record === simulationResult?.optimal_result ? 'bold' : undefined,
          }}
        >
          ¥{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>
        <ExperimentOutlined /> 库存策略沙盒
      </Title>
      <Paragraph type="secondary">
        输入参数进行库存策略计算和服务水平模拟，帮助您找到最优的安全库存和再订货点设置
      </Paragraph>

      <Row gutter={24}>
        {/* Input Form */}
        <Col xs={24} lg={8}>
          <Card title="参数设置" loading={loading}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                service_level: 95,
                lead_time: 7,
                unit_cost: 100,
                holding_cost_rate: 20,
                stockout_cost: 500,
                user_forecast: 1000,
              }}
            >
              <Form.Item
                name="customer_id"
                label={
                  <Space>
                    客户
                    <Tooltip title="选择客户以使用其历史偏差数据">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Select
                  placeholder="选择客户（可选）"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={customers.map(c => ({
                    value: c.id,
                    label: `${c.customer_code} - ${c.name}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="user_forecast"
                label="用户预测数量"
                rules={[{ required: true, message: '请输入预测数量' }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="输入预测的需求数量"
                />
              </Form.Item>

              <Form.Item
                name="lead_time"
                label="提前期（天）"
                rules={[{ required: true, message: '请输入提前期' }]}
              >
                <InputNumber
                  min={1}
                  max={365}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="service_level"
                label={
                  <Space>
                    服务水平
                    <Tooltip title="期望的订单满足率，例如95%表示有95%的概率不会缺货">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Slider
                  min={80}
                  max={99.9}
                  step={0.5}
                  marks={{
                    85: '85%',
                    90: '90%',
                    95: '95%',
                    99: '99%',
                  }}
                />
              </Form.Item>

              <Divider>成本参数</Divider>

              <Form.Item
                name="unit_cost"
                label="单位成本 (¥)"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="holding_cost_rate"
                label="持有成本率 (%/年)"
              >
                <InputNumber
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="stockout_cost"
                label="单位缺货成本 (¥)"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleCalculatePolicy}
                    loading={calculating}
                  >
                    计算策略
                  </Button>
                  <Button
                    icon={<ExperimentOutlined />}
                    onClick={handleSimulation}
                    loading={simulating}
                  >
                    服务水平模拟
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Results */}
        <Col xs={24} lg={16}>
          {/* Policy Result */}
          {policyResult && (
            <Card title="策略计算结果" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="安全库存"
                    value={policyResult.safety_stock}
                    prefix={<SafetyOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="再订货点"
                    value={policyResult.reorder_point}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="预测实际需求"
                    value={policyResult.predicted_actual}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="调整系数"
                    value={policyResult.adjustment_factor}
                    precision={3}
                    valueStyle={{
                      color: policyResult.adjustment_factor > 1 ? '#ff4d4f' : '#52c41a',
                    }}
                  />
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Z-Score"
                    value={policyResult.z_score}
                    precision={3}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="需求标准差"
                    value={policyResult.demand_std}
                    precision={2}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="服务水平"
                    value={policyResult.service_level * 100}
                    precision={1}
                    suffix="%"
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="可靠性"
                    value={policyResult.reliability === 'high' ? '高' : policyResult.reliability === 'medium' ? '中' : '低'}
                    valueStyle={{
                      color: policyResult.reliability === 'high' ? '#52c41a' : policyResult.reliability === 'medium' ? '#faad14' : '#ff4d4f',
                    }}
                  />
                </Col>
              </Row>
              
              <Alert
                style={{ marginTop: 16 }}
                message="计算公式"
                description={
                  <div>
                    <div>安全库存 = Z × σ × √提前期</div>
                    <div>再订货点 = 预测实际需求 × 提前期/30 + 安全库存</div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        其中 Z={policyResult.z_score.toFixed(3)} (对应服务水平 {(policyResult.service_level * 100).toFixed(1)}%), 
                        σ={policyResult.demand_std.toFixed(2)} (需求标准差)
                      </Text>
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />
            </Card>
          )}

          {/* Simulation Results */}
          {simulationResult && (
            <>
              <Card title="服务水平模拟结果" style={{ marginBottom: 16 }}>
                <Alert
                  message={`最优服务水平: ${(simulationResult.optimal_result.service_level * 100).toFixed(0)}%`}
                  description={`在考虑持有成本和缺货成本的情况下，最优总成本为 ¥${simulationResult.optimal_result.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Table
                  columns={simulationColumns}
                  dataSource={simulationResult.results}
                  rowKey="service_level"
                  pagination={false}
                  size="small"
                  rowClassName={record => 
                    record.service_level === simulationResult.optimal_result.service_level 
                      ? 'ant-table-row-selected' 
                      : ''
                  }
                />
              </Card>

              <Card title="成本曲线">
                <Line
                  data={costChartData}
                  xField="serviceLevel"
                  yField="totalCost"
                  height={250}
                  point={{ size: 5 }}
                  label={{
                    formatter: (datum: any) => `¥${datum.totalCost.toLocaleString()}`,
                  }}
                  yAxis={{
                    label: {
                      formatter: (v: string) => `¥${Number(v).toLocaleString()}`,
                    },
                  }}
                />
              </Card>
            </>
          )}

          {!policyResult && !simulationResult && (
            <Card>
              <Empty
                description="请在左侧设置参数并点击计算"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default PolicySandbox;
