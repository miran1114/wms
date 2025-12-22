import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, message } from 'antd';
import { InventoryItem } from '../../types/inventory';
import { useInventoryStore } from '../../stores/inventoryStore';

interface PriceEditModalProps {
  visible: boolean;
  product: InventoryItem | null;
  onClose: () => void;
}

const PriceEditModal: React.FC<PriceEditModalProps> = ({ visible, product, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { updatePrice } = useInventoryStore();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (product) {
        await updatePrice(product.id, values.newPrice);
        message.success('价格更新成功');
        form.resetFields();
        onClose();
      }
    } catch (error) {
      message.error('价格更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      title={`价格调整 - ${product.name}`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="当前价格">
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1890ff' }}>
            ¥{product.price.toFixed(2)}
          </div>
        </Form.Item>

        <Form.Item
          name="newPrice"
          label="新价格"
          initialValue={product.price}
          rules={[
            { required: true, message: '请输入新价格' },
            { type: 'number', min: 0.01, message: '价格必须大于0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入新价格"
            min={0.01}
            max={999999.99}
            precision={2}
            formatter={(value) => `¥${value}`}
            parser={(value) => (value ?? '').replace(/¥\s?/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="调价原因"
          rules={[{ required: true, message: '请输入调价原因' }]}
        >
          <Input.TextArea
            placeholder="请输入价格调整的原因，如：市场调价、促销活动、成本变化等"
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item label="价格变化">
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const newPrice = getFieldValue('newPrice') || product.price;
              const currentPrice = product.price;
              const priceChange = newPrice - currentPrice;
              const changePercentage = currentPrice !== 0 ? (priceChange / currentPrice) * 100 : 0;
              
              return (
                <div style={{ fontSize: 14 }}>
                  <div>
                    价格变化: 
                    <span style={{ 
                      color: priceChange >= 0 ? '#52c41a' : '#ff4d4f',
                      fontWeight: 500 
                    }}>
                      {priceChange >= 0 ? '+' : ''}¥{priceChange.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    变化幅度: 
                    <span style={{ 
                      color: changePercentage >= 0 ? '#52c41a' : '#ff4d4f',
                      fontWeight: 500 
                    }}>
                      {changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ marginTop: 8, color: '#666' }}>
                    新价格: <span style={{ fontWeight: 500 }}>¥{newPrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            }}
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PriceEditModal;
