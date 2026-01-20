import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Tag,
  Space,
  Spin,
  message,
  Select,
  DatePicker,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  SafetyOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import { forecastApi, ForecastDashboard, DemandTrend } from '../services/forecast';

const { Title, Text } = Typography;

const ForecastDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ForecastDashboard | null>(null);
  const [trendData, setTrendData] = useState<DemandTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  useEffect(() => {
    loadDashboard();
    loadTrend();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await forecastApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      message.error('加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTrend = async (year?: number) => {
    setTrendLoading(true);
    try {
      const data = await forecastApi.getDemandTrend({
        groupBy: 'month',
        year,
      });
      setTrendData(data.trend);
    } catch (error) {
      message.error('加载趋势数据失败');
    } finally {
      setTrendLoading(false);
    }
  };

  const handleYearChange = (value: number | undefined) => {
    setSelectedYear(value);
    loadTrend(value);
  };

  const forecastColumns = [
    {
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.product_sku}</Text>
        </Space>
      ),
    },
    {
      title: '目标期间',
      key: 'target_period',
      render: (_: any, record: any) => `${record.target_year}年${record.target_month}月`,
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
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: '可靠性',
      dataIndex: 'reliability_display',
      key: 'reliability',
      render: (text: string, record: any) => (
        <Tag color={record.reliability === 'high' ? 'green' : record.reliability === 'medium' ? 'orange' : 'red'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString('zh-CN'),
    },
  ];

  // Prepare chart data
  const trendChartData = trendData.flatMap(item => [
    {
      period: `${item.year}-${String(item.month).padStart(2, '0')}`,
      type: '实际数量',
      value: item.total_actual,
    },
    {
      period: `${item.year}-${String(item.month).padStart(2, '0')}`,
      type: '预测数量',
      value: item.total_forecast,
    },
  ]);

  const yearlySummaryData = dashboard?.yearly_summary.map(item => ({
    year: String(item.year),
    actual: item.total_actual,
    forecast: item.total_forecast,
  })) || [];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!dashboard) {
    return <Empty description="暂无数据" />;
  }

  return (
    <div>
      <Title level={2}>
        <LineChartOutlined /> 预测分析仪表板
      </Title>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="客户数量"
              value={dashboard.counts.customers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="需求记录"
              value={dashboard.counts.demand_records}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="预测记录"
              value={dashboard.counts.forecasts}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="库存策略"
              value={dashboard.counts.policies}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bias Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="整体预测偏差分析">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="平均偏差率"
                  value={dashboard.overall_stats.avg_bias_rate * 100}
                  precision={2}
                  suffix="%"
                  valueStyle={{
                    color: Math.abs(dashboard.overall_stats.avg_bias_rate) > 0.15 ? '#ff4d4f' : '#52c41a',
                  }}
                  prefix={dashboard.overall_stats.avg_bias_rate > 0 ? <RiseOutlined /> : <FallOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="MAPE"
                  value={dashboard.overall_stats.mape}
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="MAE"
                  value={dashboard.overall_stats.mae}
                  precision={2}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Statistic
                  title="标准误差"
                  value={dashboard.overall_stats.std_error}
                  precision={4}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="历史记录数"
                  value={dashboard.overall_stats.record_count}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="年度汇总">
            {yearlySummaryData.length > 0 ? (
              <Column
                data={yearlySummaryData.flatMap(item => [
                  { year: item.year, type: '实际', value: item.actual },
                  { year: item.year, type: '预测', value: item.forecast },
                ])}
                xField="year"
                yField="value"
                seriesField="type"
                isGroup
                height={200}
                color={['#1890ff', '#52c41a']}
              />
            ) : (
              <Empty description="暂无年度数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      <Card
        title="供需趋势分析"
        extra={
          <Select
            placeholder="选择年份"
            allowClear
            style={{ width: 120 }}
            onChange={handleYearChange}
            options={dashboard.yearly_summary.map(item => ({
              value: item.year,
              label: `${item.year}年`,
            }))}
          />
        }
        style={{ marginBottom: 24 }}
      >
        {trendLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin />
          </div>
        ) : trendChartData.length > 0 ? (
          <Line
            data={trendChartData}
            xField="period"
            yField="value"
            seriesField="type"
            height={300}
            point={{ size: 3 }}
            color={['#1890ff', '#52c41a']}
            legend={{ position: 'top' }}
          />
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </Card>

      {/* Recent Forecasts */}
      <Card title="最近预测记录">
        <Table
          columns={forecastColumns}
          dataSource={dashboard.recent_forecasts}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default ForecastDashboardPage;
