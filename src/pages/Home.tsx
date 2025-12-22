import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Tag, Progress, Alert } from 'antd';
import { 
  ShoppingCartOutlined, 
  DollarOutlined, 
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import InventoryTable from '../components/InventoryTable/InventoryTable';
import { useInventoryStore } from '../stores/inventoryStore';
import { formatCurrency, formatNumber } from '../utils/formatters';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { inventory, loading, fetchInventory } = useInventoryStore();
  
  useEffect(() => {
    fetchInventory();
  }, []);

  // 计算统计数据
  const totalProducts = inventory.length;
  const totalStock = inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
  const lowStockProducts = inventory.filter(item => item.lowStockWarning).length;
  const lowStockPercentage = totalProducts > 0 ? (lowStockProducts / totalProducts) * 100 : 0;

  // 最近更新的商品
  const recentProducts = [...inventory]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  const handleProductClick = (product: any) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="fade-in">
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="mobile-card-grid tablet-card-grid">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card responsive-stat-card">
            <Statistic
              title="商品总数"
              value={totalProducts}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card responsive-stat-card">
            <Statistic
              title="总库存"
              value={totalStock}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={loading}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card responsive-stat-card">
            <Statistic
              title="库存总值"
              value={totalValue}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              loading={loading}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card responsive-stat-card">
            <Statistic
              title="低库存商品"
              value={lowStockProducts}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              loading={loading}
              suffix={`/${totalProducts}`}
            />
            <Progress 
              percent={lowStockPercentage} 
              size="small" 
              status={lowStockPercentage > 30 ? 'exception' : 'normal'}
              showInfo={false}
            />
          </Card>
        </Col>
      </Row>

      {/* 低库存警告 */}
      {lowStockProducts > 0 && (
        <Alert
          message="库存预警"
          description={`有 ${lowStockProducts} 个商品库存不足，请及时补货`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <a href="/ai-analysis" style={{ color: '#faad14' }}>
              查看AI补货建议
            </a>
          }
        />
      )}

      {/* 最近更新 */}
      {!loading && recentProducts.length > 0 && (
        <Card title="最近更新" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {recentProducts.map((product) => (
              <Col xs={24} sm={12} lg={8} key={product.id}>
                <div 
                  style={{ 
                    padding: 12, 
                    border: '1px solid #f0f0f0', 
                    borderRadius: 6,
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  onClick={() => handleProductClick(product)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1890ff';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        库存: {formatNumber(product.stock)} {product.unit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 500, color: '#1890ff' }}>
                        {formatCurrency(product.price)}
                      </div>
                      {product.lowStockWarning && (
                        <Tag color="error" style={{ marginTop: 4 }}>低库存</Tag>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 库存表格 */}
      <Card 
        title="库存管理" 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: 0 }}
      >
        <InventoryTable onProductClick={handleProductClick} />
      </Card>

      {/* 库存分布概览 */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="库存状态分布">
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span>库存充足</span>
                <span>{totalProducts - lowStockProducts} 个商品</span>
              </div>
              <Progress 
                percent={((totalProducts - lowStockProducts) / totalProducts) * 100} 
                strokeColor="#52c41a"
                showInfo={false}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, marginTop: 24 }}>
                <span>低库存</span>
                <span>{lowStockProducts} 个商品</span>
              </div>
              <Progress 
                percent={(lowStockProducts / totalProducts) * 100} 
                strokeColor="#ff4d4f"
                showInfo={false}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="库存价值分布">
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span>高价值商品</span>
                <Tag color="gold">库存价值 {'>'} ¥1000</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span>中价值商品</span>
                <Tag color="blue">库存价值 ¥100-1000</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span>低价值商品</span>
                <Tag color="default">库存价值 {'<'} ¥100</Tag>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>总计</span>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
