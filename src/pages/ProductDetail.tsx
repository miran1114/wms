import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Button, InputNumber, message, Tabs } from 'antd';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Line } from '@ant-design/charts';
import { useInventoryStore } from '../stores/inventoryStore';
import apiService from '../services/api';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/formatters';

const { TabPane } = Tabs;

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inventory, updateStock, updatePrice } = useInventoryStore();
  
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ stock: 0, price: 0 });
  
  const product = inventory.find(item => item.id === id);

  const [priceHistoryData, setPriceHistoryData] = useState<Array<{ date: string; price: number }>>([]);
  const [stockHistoryData, setStockHistoryData] = useState<Array<{ date: string; stock: number }>>([]);

  useEffect(() => {
    if (product) {
      setEditData({ stock: product.stock, price: product.price });
      // 拉取真实历史
      (async () => {
        try {
          const ph = await apiService.getPriceHistory(product.id);
          const sh = await apiService.getStockHistory(product.id);
          setPriceHistoryData(ph);
          setStockHistoryData(sh);
        } catch (e) {
          // 保底：使用当前值占位
          setPriceHistoryData([{ date: new Date().toISOString().slice(0, 10), price: product.price }]);
          setStockHistoryData([{ date: new Date().toISOString().slice(0, 10), stock: product.stock }]);
        }
      })();
    }
  }, [product]);

  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <h3>商品未找到</h3>
            <Button 
              type="primary" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{ marginTop: 16 }}
            >
              返回库存总览
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      if (editData.stock !== product.stock) {
        const delta = Math.abs(editData.stock - product.stock);
        const op = editData.stock > product.stock ? 'increase' : 'decrease';
        if (delta > 0) {
          await updateStock(product.id, delta, op);
        }
      }
      if (editData.price !== product.price) {
        await updatePrice(product.id, editData.price);
      }
      message.success('商品信息更新成功');
      setEditing(false);
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleCancel = () => {
    setEditData({ stock: product.stock, price: product.price });
    setEditing(false);
  };

  

  const priceChartConfig = {
    data: priceHistoryData,
    xField: 'date',
    yField: 'price',
    smooth: true,
    point: { size: 4 },
    lineStyle: { stroke: '#1890ff', lineWidth: 2 },
    meta: {
      price: {
        formatter: (v: number) => formatCurrency(v),
      },
    },
    tooltip: {
      showTitle: true,
      showMarkers: true,
      showCrosshairs: true,
      fields: ['date', 'price'],
      formatter: (datum: any) => ({ name: '价格', value: formatCurrency(Number(datum.price)) }),
    },
    yAxis: {
      label: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  const stockChartConfig = {
    data: stockHistoryData,
    xField: 'date',
    yField: 'stock',
    smooth: true,
    point: { size: 4 },
    lineStyle: { stroke: '#52c41a', lineWidth: 2 },
    meta: {
      stock: {
        formatter: (v: number) => `${formatNumber(v)} ${product.unit}`,
      },
    },
    tooltip: {
      showTitle: true,
      showMarkers: true,
      showCrosshairs: true,
      fields: ['date', 'stock'],
      formatter: (datum: any) => ({ name: '库存', value: `${formatNumber(Number(datum.stock))} ${product.unit}` }),
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{ marginRight: 16 }}
        >
          返回
        </Button>
        <Button 
          type="primary"
          icon={editing ? <SaveOutlined /> : <EditOutlined />}
          onClick={editing ? handleSave : () => setEditing(true)}
          style={{ marginRight: 8 }}
        >
          {editing ? '保存' : '编辑'}
        </Button>
        {editing && (
          <Button onClick={handleCancel}>取消</Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card>
            <Statistic
              title="商品名称"
              value={product.name}
              valueStyle={{ fontSize: 18, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Statistic
              title="SKU"
              value={product.sku || '无'}
              valueStyle={{ color: '#666' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Statistic
              title="分类"
              value={product.category || '未分类'}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card>
            {editing ? (
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>库存数量</div>
                <InputNumber
                  value={editData.stock}
                  onChange={(value) => setEditData({ ...editData, stock: value || 0 })}
                  min={0}
                  max={10000}
                  style={{ width: '100%' }}
                  addonAfter={product.unit}
                />
              </div>
            ) : (
              <Statistic
                title="库存数量"
                value={product.stock}
                suffix={product.unit}
                valueStyle={{ color: product.lowStockWarning ? '#ff4d4f' : '#52c41a' }}
              />
            )}
            {product.lowStockWarning && (
              <Tag color="error" style={{ marginTop: 8 }}>低库存警告</Tag>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            {editing ? (
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>售价</div>
                <InputNumber
                  value={editData.price}
                  onChange={(value) => setEditData({ ...editData, price: value || 0 })}
                  min={0.01}
                  max={999999.99}
                  precision={2}
                  style={{ width: '100%' }}
                  addonBefore="¥"
                />
              </div>
            ) : (
              <Statistic
                title="售价"
                value={product.price}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Statistic
              title="库存价值"
              value={product.stock * product.price}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="存放位置">
            <div style={{ fontSize: 16 }}>{product.location || '未指定位置'}</div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="安全库存">
            <div style={{ fontSize: 16 }}>
              {product.minSafetyStock || 0} {product.unit}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="详细信息">
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>最后更新</div>
              <div style={{ fontWeight: 500 }}>{formatDateTime(product.lastUpdated)}</div>
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', marginBottom: 4 }}>商品描述</div>
              <div style={{ fontWeight: 500 }}>{(product as any).description || '暂无描述'}</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Tabs style={{ marginTop: 24 }}>
        <TabPane tab="价格历史" key="price">
          <Card>
            <Line {...priceChartConfig} />
          </Card>
        </TabPane>
        <TabPane tab="库存历史" key="stock">
          <Card>
            <Line {...stockChartConfig} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProductDetail;
