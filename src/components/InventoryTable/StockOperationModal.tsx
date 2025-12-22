import React, { useState } from 'react';
import { Modal, Form, InputNumber, Radio, Input, message } from 'antd';
import { InventoryItem } from '../../types/inventory';
import { useInventoryStore } from '../../stores/inventoryStore';

interface StockOperationModalProps {
  visible: boolean;
  product: InventoryItem | null;
  onClose: () => void;
}

const StockOperationModal: React.FC<StockOperationModalProps> = ({ visible, product, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { updateStock } = useInventoryStore();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (product) {
        await updateStock(product.id, values.quantity, values.operation);
        message.success('库存更新成功');
        form.resetFields();
        onClose();
      }
    } catch (error) {
      message.error('库存更新失败');
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
      title={`库存调整 - ${product.name}`}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="当前库存">
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1890ff' }}>
            {product.stock} {product.unit}
          </div>
        </Form.Item>

        <Form.Item
          name="operation"
          label="操作类型"
          initialValue="increase"
          rules={[{ required: true, message: '请选择操作类型' }]}
        >
          <Radio.Group>
            <Radio value="increase">增加库存</Radio>
            <Radio value="decrease">减少库存</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="quantity"
          label="数量"
          rules={[
            { required: true, message: '请输入数量' },
            { type: 'number', min: 1, message: '数量必须大于0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={`请输入要调整的数量（${product.unit}）`}
            min={1}
            max={10000}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="调整原因"
          rules={[{ required: true, message: '请输入调整原因' }]}
        >
          <Input.TextArea
            placeholder="请输入库存调整的原因，如：采购入库、销售出库、盘点调整等"
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item label="调整后库存">
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const operation = getFieldValue('operation');
              const quantity = getFieldValue('quantity') || 0;
              const currentStock = product.stock;
              const newStock = operation === 'increase' 
                ? currentStock + quantity 
                : currentStock - quantity;
              
              return (
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 500, 
                  color: newStock < 0 ? '#ff4d4f' : '#52c41a' 
                }}>
                  {newStock} {product.unit}
                  {newStock < 0 && (
                    <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                      ⚠️ 库存不能为负数
                    </div>
                  )}
                </div>
              );
            }}
          </Form.Item>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StockOperationModal;
