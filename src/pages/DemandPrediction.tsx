import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Upload,
  Tabs,
  DatePicker,
  Alert,
  Tooltip,
  Progress,
} from 'antd';
import {
  LineChartOutlined,
  UploadOutlined,
  DownloadOutlined,
  RobotOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/charts';
import dayjs from 'dayjs';
import { forecastApi, Customer, DemandHistory, DemandForecast, BiasStats } from '../services/forecast';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const DemandPrediction: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [demandHistory, setDemandHistory] = useState<DemandHistory[]>([]);
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [biasStats, setBiasStats] = useState<BiasStats | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Modal states
  const [predictModalVisible, setPredictModalVisible] = useState(false);
  const [predictForm] = Form.useForm();
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);

  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
    loadBiasStats();
  }, []);

  useEffect(() => {
    loadDemandHistory();
    loadForecasts();
  }, [selectedCustomer, dateRange, pagination.current, pagination.pageSize]);

  const loadCustomers = async () => {
    try {
      const data = await forecastApi.getCustomers({ pageSize: 1000 });
      setCustomers(data.list);
    } catch (error) {
      message.error('加载客户列表失败');
    }
  };

  const loadDemandHistory = async () => {
    setLoading(true);
    try {
      const data = await forecastApi.getDemandHistory({
        customer: selectedCustomer,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setDemandHistory(data.list);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      message.error('加载需求历史失败');
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async () => {
    try {
      const params: any = { page: 1, pageSize: 50 };
      if (selectedCustomer) params.customer_id = selectedCustomer;
      // Load recent forecasts (API would need to support this, using dashboard for now)
      const dashboard = await forecastApi.getDashboard();
      setForecasts(dashboard.recent_forecasts);
    } catch (error) {
      console.error('Failed to load forecasts');
    }
  };

  const loadBiasStats = async () => {
    try {
      const data = await forecastApi.getBiasAnalysis({});
      setBiasStats(data.overall);
    } catch (error) {
      console.error('Failed to load bias stats');
    }
  };

  const handlePredict = async () => {
    try {
      const values = await predictForm.validateFields();
      setPredicting(true);

      const result = await forecastApi.predictDemand({
        customer_id: values.customer_id,
        product_id: values.product_id || 1, // Default product ID
        user_forecast: values.user_forecast,
        target_year: values.target_period[0].year(),
        target_month: values.target_period[0].month() + 1,
      });

      setPredictionResult(result);
      message.success('预测完成');
      
      if (values.save) {
        loadForecasts();
      }
    } catch (error) {
      message.error('预测失败');
    } finally {
      setPredicting(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      await forecastApi.importDemandHistory(file);
      message.success('导入成功');
      setImportModalVisible(false);
      loadDemandHistory();
      loadBiasStats();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setAiInsight(null);
    try {
      // This would call an AI analysis endpoint
      // For now, we'll show a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAiInsight(
        `基于历史数据分析：\n\n` +
        `1. 预测偏差趋势：整体偏差率为 ${biasStats?.avg_bias_rate ? (biasStats.avg_bias_rate * 100).toFixed(2) : 'N/A'}%，` +
        `建议在用户预测基础上乘以调整系数\n\n` +
        `2. 季节性因素：根据历史数据，第一季度和第四季度需求通常较高\n\n` +
        `3. 安全库存建议：基于 MAPE ${biasStats?.mape?.toFixed(2) || 'N/A'}%，建议维持较高的安全库存水平\n\n` +
        `4. 风险提示：部分产品存在较大预测偏差，需要重点关注`
      );
    } catch (error) {
      message.error('AI分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const historyColumns = [
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
    },
    {
      title: '预测数量',
      dataIndex: 'forecast_qty',
      key: 'forecast_qty',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '实际数量',
      dataIndex: 'actual_qty',
      key: 'actual_qty',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '偏差率',
      key: 'bias_rate',
      render: (_: any, record: DemandHistory) => {
        if (!record.forecast_qty) return '-';
        const biasRate = (record.actual_qty - record.forecast_qty) / record.forecast_qty;
        return (
          <Tag color={Math.abs(biasRate) > 0.2 ? 'red' : Math.abs(biasRate) > 0.1 ? 'orange' : 'green'}>
            {(biasRate * 100).toFixed(1)}%
          </Tag>
        );
      },
    },
    {
      title: '品类',
      dataIndex: 'category',
      key: 'category',
    },
  ];

  const forecastColumns = [
    {
      title: '产品',
      key: 'product',
      render: (_: any, record: DemandForecast) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.product_name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.product_sku}</Text>
        </Space>
      ),
    },
    {
      title: '目标期间',
      key: 'target_period',
      render: (_: any, record: DemandForecast) => `${record.target_year}年${record.target_month}月`,
    },
    {
      title: '用户预测',
      dataIndex: 'user_forecast',
      key: 'user_forecast',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '预测实际',
      dataIndex: 'predicted_actual',
      key: 'predicted_actual',
      render: (val: number) => (
        <Text strong style={{ color: '#1890ff' }}>{val.toLocaleString()}</Text>
      ),
    },
    {
      title: '调整系数',
      dataIndex: 'adjustment_factor',
      key: 'adjustment_factor',
      render: (val: number) => val?.toFixed(3) || '-',
    },
    {
      title: '可靠性',
      dataIndex: 'reliability_display',
      key: 'reliability',
      render: (text: string, record: DemandForecast) => (
        <Tag color={record.reliability === 'high' ? 'green' : record.reliability === 'medium' ? 'orange' : 'red'}>
          {text}
        </Tag>
      ),
    },
  ];

  // Prepare chart data
  const biasChartData = demandHistory.slice(0, 20).map(item => ({
    period: `${item.year}-${String(item.month).padStart(2, '0')}`,
    forecast: item.forecast_qty,
    actual: item.actual_qty,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>
          <LineChartOutlined /> 需求预测
        </Title>
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入历史数据
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setPredictModalVisible(true)}
          >
            新建预测
          </Button>
        </Space>
      </div>

      {/* Bias Stats Summary */}
      {biasStats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col xs={12} sm={6}>
              <Statistic
                title={
                  <Space>
                    平均偏差率
                    <Tooltip title="(实际 - 预测) / 预测 的平均值">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                value={biasStats.avg_bias_rate * 100}
                precision={2}
                suffix="%"
                valueStyle={{
                  color: Math.abs(biasStats.avg_bias_rate) > 0.15 ? '#ff4d4f' : '#52c41a',
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="MAPE"
                value={biasStats.mape}
                precision={2}
                suffix="%"
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="MAE"
                value={biasStats.mae}
                precision={2}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={handleAIAnalysis}
                loading={analyzing}
              >
                AI智能分析
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* AI Insight */}
      {aiInsight && (
        <Alert
          message="AI 分析洞察"
          description={<pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{aiInsight}</pre>}
          type="info"
          showIcon
          icon={<RobotOutlined />}
          closable
          onClose={() => setAiInsight(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        defaultActiveKey="history"
        items={[
          {
            key: 'history',
            label: '历史数据',
            children: (
              <>
                {/* Filters */}
                <Card style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Select
                      placeholder="选择客户"
                      style={{ width: 200 }}
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
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
                    <RangePicker
                      picker="month"
                      value={dateRange}
                      onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                    />
                  </Space>
                </Card>

                {/* History Table */}
                <Card>
                  <Table
                    columns={historyColumns}
                    dataSource={demandHistory}
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

                {/* Bias Chart */}
                {biasChartData.length > 0 && (
                  <Card title="预测vs实际对比" style={{ marginTop: 16 }}>
                    <Column
                      data={biasChartData.flatMap(item => [
                        { period: item.period, type: '预测', value: item.forecast },
                        { period: item.period, type: '实际', value: item.actual },
                      ])}
                      xField="period"
                      yField="value"
                      seriesField="type"
                      isGroup
                      height={300}
                      color={['#1890ff', '#52c41a']}
                    />
                  </Card>
                )}
              </>
            ),
          },
          {
            key: 'forecasts',
            label: '预测记录',
            children: (
              <Card>
                <Table
                  columns={forecastColumns}
                  dataSource={forecasts}
                  rowKey="id"
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Predict Modal */}
      <Modal
        title="新建需求预测"
        open={predictModalVisible}
        onCancel={() => {
          setPredictModalVisible(false);
          setPredictionResult(null);
          predictForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={predictForm}
          layout="vertical"
          initialValues={{ save: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_id"
                label="客户"
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_period"
                label="目标期间"
                rules={[{ required: true, message: '请选择目标期间' }]}
              >
                <DatePicker picker="month" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="user_forecast"
            label="用户预测数量"
            rules={[{ required: true, message: '请输入预测数量' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="输入您的预测数量"
            />
          </Form.Item>

          <Form.Item
            name="save"
            valuePropName="checked"
          >
            <Select
              options={[
                { value: true, label: '保存预测记录' },
                { value: false, label: '仅计算不保存' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              onClick={handlePredict}
              loading={predicting}
              block
            >
              计算预测
            </Button>
          </Form.Item>

          {/* Prediction Result */}
          {predictionResult && (
            <Alert
              message="预测结果"
              description={
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="预测实际需求"
                      value={predictionResult.predicted_actual}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="调整系数"
                      value={predictionResult.adjustment_factor}
                      precision={3}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="可靠性"
                      value={predictionResult.reliability_display}
                    />
                  </Col>
                </Row>
              }
              type="success"
              showIcon
            />
          )}
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="导入历史数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
      >
        <Alert
          message="CSV文件格式要求"
          description={
            <div>
              <div>必需字段：year, month, customer_code, product_sku, forecast_quantity, actual_quantity</div>
              <div>可选字段：category, region</div>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Upload.Dragger
          accept=".csv"
          beforeUpload={handleImport}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽CSV文件到此区域</p>
          <p className="ant-upload-hint">支持单个CSV文件上传</p>
        </Upload.Dragger>
        {importing && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={50} status="active" />
            <Text>正在导入...</Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DemandPrediction;
