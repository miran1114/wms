import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { InventoryItem } from '../../types/inventory';
import { useInventoryStore } from '../../stores/inventoryStore';
import { STOCK_UNITS, PRODUCT_CATEGORIES } from '../../utils/constants';
import { generateSKU } from '../../utils/formatters';

interface NewProductModalProps {
  visible: boolean;
  onClose: () => void;
}

const NewProductModal: React.FC<NewProductModalProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { createProduct } = useInventoryStore();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 生成SKU
      const sku = generateSKU(values.name, values.category);
      
      const productData: Partial<InventoryItem> = {
        ...values,
        sku,
        id: Date.now().toString(),
        lastUpdated: new Date().toISOString(),
        lowStockWarning: values.stock <= (values.minSafetyStock || 5),
      };
      
      await createProduct(productData);
      message.success('商品创建成功');
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('商品创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // 自动生成SKU
  const handleFieldChange = () => {
    const name = form.getFieldValue('name');
    const category = form.getFieldValue('category');
    if (name) {
      const sku = generateSKU(name, category);
      form.setFieldsValue({ sku });
    }
  };

  return (
    <Modal
      title="新增商品"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="确认"
      cancelText="取消"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="商品名称"
          rules={[{ required: true, message: '请输入商品名称' }]}
        >
          <Input 
            placeholder="请输入商品名称"
            onChange={handleFieldChange}
            maxLength={100}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="sku"
          label="SKU"
          rules={[{ required: true, message: '请输入SKU' }]}
        >
          <Input 
            placeholder="请输入SKU或留空自动生成"
            maxLength={32}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="商品分类"
          rules={[{ required: true, message: '请选择商品分类' }]}
        >
          <Select 
            placeholder="请选择商品分类"
            onChange={handleFieldChange}
          >
            {PRODUCT_CATEGORIES.map(category => (
              <Select.Option key={category} value={category}>
                {category}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="stock"
          label="初始库存"
          rules={[
            { required: true, message: '请输入初始库存' },
            { type: 'number', min: 0, message: '库存不能为负数' }
          ]}
          initialValue={0}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入初始库存"
            min={0}
            max={10000}
          />
        </Form.Item>

        <Form.Item
          name="unit"
          label="库存单位"
          rules={[{ required: true, message: '请选择库存单位' }]}
          initialValue="件"
        >
          <Select placeholder="请选择库存单位">
            {STOCK_UNITS.map(unit => (
              <Select.Option key={unit} value={unit}>
                {unit}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="price"
          label="售价"
          rules={[
            { required: true, message: '请输入售价' },
            { type: 'number', min: 0.01, message: '售价必须大于0' },
          ]}
          initialValue={0.01}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入售价"
            min={0.01}
            max={999999.99}
            precision={2}
            formatter={(value) => `¥${value}`}
            parser={(value) => (value ?? '').replace(/¥\s?/g, '')}
          />
        </Form.Item>

        <Form.Item
          name="minSafetyStock"
          label="安全库存"
          rules={[
            { type: 'number', min: 0, message: '安全库存不能为负数' },
          ]}
          initialValue={5}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入安全库存（低库存预警阈值）"
            min={0}
            max={1000}
          />
        </Form.Item>

        <Form.Item
          name="location"
          label="存放位置"
          rules={[{ max: 64, message: '存放位置不能超过64个字符' }]}
        >
          <Input 
            placeholder="请输入存放位置，如：A1-01-01"
            maxLength={64}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="商品描述"
          rules={[{ max: 500, message: '商品描述不能超过500个字符' }]}
        >
          <Input.TextArea
            placeholder="请输入商品描述（可选）"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewProductModal;
