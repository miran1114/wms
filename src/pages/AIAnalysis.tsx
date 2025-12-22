import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Progress, Tag, Empty, Spin, message, Statistic, Alert, Modal } from 'antd';
import { Line, Radar } from '@ant-design/charts';
import { 
  RobotOutlined, 
  ReloadOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const AIAnalysis: React.FC = () => {
  const { inventory, updateStock, updatePrice, fetchInventory } = useInventoryStore();

  useEffect(() => {
    if (inventory.length === 0) {
      fetchInventory();
    }
  }, []);
  const { 
    isAnalyzing, 
    progress, 
    result, 
    error,
    startGlobalAnalysis,
    triggerInventoryAnalysis,
    triggerPricingUpdate,
    clearResult,
    contextInventory
  } = useAnalysisStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'restock' | 'pricing'>('overview');

  // 库存周转率图表配置
  const turnoverChartConfig = {
    data: result?.turnoverRate.chartData || [],
    xField: 'date',
    yField: 'rate',
    smooth: true,
    point: {
      size: 4,
      shape: 'circle',
    },
    label: {
      style: {
        fill: '#1890ff',
      },
    },
    lineStyle: {
      stroke: '#1890ff',
      lineWidth: 2,
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: '周转率',
          value: formatPercentage(datum.rate),
        };
      },
    },
    yAxis: {
      label: {
        formatter: (value: number) => formatPercentage(value),
      },
    },
  };

  // 定价评估雷达图配置
  const pricingRadarConfig = {
    data: [
      { item: '价格竞争力', score: 85 },
      { item: '利润率', score: 70 },
      { item: '市场需求', score: 90 },
      { item: '库存周转', score: result?.turnoverRate.average ? result.turnoverRate.average * 100 : 75 },
      { item: '客户满意度', score: 80 },
    ],
    xField: 'item',
    yField: 'score',
    area: {
      style: {
        fillOpacity: 0.3,
      },
    },
    point: {
      size: 3,
    },
    xAxis: {
      label: {
        style: {
          fontSize: 12,
        },
      },
    },
    yAxis: {
      min: 0,
      max: 100,
      label: false,
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.item,
          value: `${datum.score}分`,
        };
      },
    },
  };

  const handleStartAnalysis = async () => {
    try {
      await startGlobalAnalysis();
      message.success('AI分析完成');
    } catch (error) {
      message.error('AI分析失败');
    }
  };

  const handleInventoryAnalysis = async () => {
    try {
      await triggerInventoryAnalysis();
      message.success('库存分析完成');
    } catch (error) {
      message.error('库存分析失败');
    }
  };

  const handlePricingUpdate = async () => {
    try {
      await triggerPricingUpdate();
      message.success('定价更新完成');
    } catch (error) {
      message.error('定价更新失败');
    }
  };

  return (
    <div className="fade-in">
      {/* 头部 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="mobile-card-grid tablet-card-grid">
        <Col xs={24} lg={12}>
          <Card className="responsive-card">
            <div style={{ textAlign: 'center' }}>
              <RobotOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <h2>AI智能库存分析</h2>
              <p style={{ color: '#666', marginBottom: 24 }}>
                基于先进的AI算法，为您提供库存优化、定价策略和补货建议
              </p>
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                onClick={handleStartAnalysis}
                loading={isAnalyzing}
                style={{ marginRight: 16 }}
              >
                开始AI分析
              </Button>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={clearResult}
                disabled={!result}
              >
                清除结果
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="分析进度">
            <div style={{ marginBottom: 16 }}>
              <Progress 
                percent={progress} 
                status={isAnalyzing ? 'active' : 'normal'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <Button
                type="default"
                icon={<ShoppingCartOutlined />}
                onClick={handleInventoryAnalysis}
                loading={isAnalyzing}
                block
              >
                库存分析
              </Button>
              <Button
                type="default"
                icon={<DollarOutlined />}
                onClick={handlePricingUpdate}
                loading={isAnalyzing}
                block
              >
                定价更新
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分析结果 */}
      {result && (
        <>
          {/* 分析摘要 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="库存周转率"
                  value={result.turnoverRate.average}
                  precision={2}
                  valueStyle={{ color: result.turnoverRate.average > 0.8 ? '#52c41a' : '#faad14' }}
                  prefix={<RiseOutlined />}
                  suffix="次/月"
                />
                <div style={{ marginTop: 16 }}>
                  {result.turnoverRate.average > 0.8 ? (
                    <Tag color="success">周转良好</Tag>
                  ) : (
                    <Tag color="warning">需要优化</Tag>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="定价合理性"
                  value={result.priceAnalysis.reasonable ? '合理' : '需调整'}
                  valueStyle={{ color: result.priceAnalysis.reasonable ? '#52c41a' : '#ff4d4f' }}
                  prefix={result.priceAnalysis.reasonable ? <RiseOutlined /> : <AlertOutlined />}
                />
                <div style={{ marginTop: 16 }}>
                  {result.priceAnalysis.suggestions.map((suggestion, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {suggestion}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card>
                <Statistic
                  title="建议总数"
                  value={result.restockSuggestions.length + result.promotionRecommendations.length}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<RobotOutlined />}
                  suffix="条"
                />
                <div style={{ marginTop: 16 }}>
                  <div>补货建议: {result.restockSuggestions.length} 条</div>
                  <div>促销建议: {result.promotionRecommendations.length} 条</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 图表分析 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="库存周转率趋势">
                {result.turnoverRate.chartData.length > 0 ? (
                  <Line {...turnoverChartConfig} />
                ) : (
                  <Empty description="暂无周转率数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="定价评估雷达图">
                <Radar {...pricingRadarConfig} />
              </Card>
            </Col>
          </Row>

          {/* 具体建议 */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card 
                title="补货建议" 
                extra={<ShoppingCartOutlined />}
                style={{ marginBottom: 16 }}
              >
                {result.restockSuggestions.length > 0 ? (
                  result.restockSuggestions.map((sug, index) => {
                    const pid = String(sug.productId);
                    const item = (inventory.find(i => String(i.id) === pid)
                                  || contextInventory.find(i => String(i.id) === pid)
                                  || (inventory.find(i => i.sku && i.sku === (sug as any).sku))
                                  || (contextInventory.find(i => i.sku && i.sku === (sug as any).sku)));
                    return (
                      <div key={index} style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {item?.name || `商品ID: ${sug.productId}`}
                              {item?.sku ? `（SKU: ${item.sku}）` : ''}
                            </div>
                            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                              当前库存: {item?.stock ?? '-'} {item?.unit ?? ''}，安全库存: {item?.minSafetyStock ?? '-'}
                            </div>
                            <div style={{ color: '#52c41a', fontSize: 12 }}>
                              建议补货: {sug.suggestedQuantity} 件；{sug.reason}
                            </div>
                          </div>
                          {item && (
                            <Button 
                              type="primary" 
                              onClick={() => {
                                const delta = Math.abs(sug.suggestedQuantity);
                                const op = sug.suggestedQuantity >= 0 ? 'increase' : 'decrease';
                                const actionText = op === 'increase' ? `补货 ${delta} 件` : `减库 ${delta} 件`;
                                Modal.confirm({
                                  title: `确认${actionText}`,
                                  content: `${item.name}${item.sku ? `（SKU:${item.sku}）` : ''} 当前库存 ${item.stock}${item.unit}`,
                                  okText: '确认',
                                  cancelText: '取消',
                                  onOk: async () => {
                                    try {
                                      await updateStock(item.id, delta, op as 'increase' | 'decrease');
                                      await fetchInventory();
                                      message.success(op === 'increase' ? '补货成功' : '减库成功');
                                    } catch {
                                      message.error(op === 'increase' ? '补货失败' : '减库失败');
                                    }
                                  }
                                });
                              }}
                            >
                              {sug.suggestedQuantity >= 0 ? `一键补货 ${Math.abs(sug.suggestedQuantity)}` : `一键减库 ${Math.abs(sug.suggestedQuantity)}`}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <Empty description="暂无补货建议" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title="促销推荐" 
                extra={<DollarOutlined />}
                style={{ marginBottom: 16 }}
              >
                {result.promotionRecommendations.length > 0 ? (
                  result.promotionRecommendations.map((rec, index) => {
                    const pid = String(rec.productId);
                    const item = (inventory.find(i => String(i.id) === pid)
                                  || contextInventory.find(i => String(i.id) === pid)
                                  || (inventory.find(i => i.sku && i.sku === (rec as any).sku))
                                  || (contextInventory.find(i => i.sku && i.sku === (rec as any).sku)));
                    const newPrice = item ? Number((item.price * rec.discount).toFixed(2)) : undefined;
                    return (
                      <div key={index} style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {item?.name || `商品ID: ${rec.productId}`}
                              {item?.sku ? `（SKU: ${item.sku}）` : ''}
                            </div>
                            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                              当前价格: {item ? formatCurrency(item.price) : '-'}；建议折扣: {formatPercentage(rec.discount)}
                            </div>
                            <div style={{ color: '#faad14', fontSize: 12 }}>
                              {rec.reason}
                            </div>
                          </div>
                          {item && newPrice !== undefined && (
                            <Button onClick={() => {
                              Modal.confirm({
                                title: `确认改价为 ${formatCurrency(newPrice)}`,
                                content: `${item.name}${item.sku ? `（SKU:${item.sku}）` : ''} 当前价格 ${formatCurrency(item.price)}`,
                                okText: '确认',
                                cancelText: '取消',
                                onOk: async () => {
                                  try {
                                    await updatePrice(item.id, newPrice);
                                    await fetchInventory();
                                    message.success('改价成功');
                                  } catch {
                                    message.error('改价失败');
                                  }
                                }
                              });
                            }}>
                              一键改价为 {formatCurrency(newPrice)}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <Empty description="暂无促销建议" />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert
          message="分析错误"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default AIAnalysis;
