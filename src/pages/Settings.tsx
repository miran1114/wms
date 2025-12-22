import React, { useEffect } from 'react';
import { Card, Form, Input, InputNumber, Switch, message } from 'antd';

const Settings: React.FC = () => {
  const [form] = Form.useForm();

  useEffect(() => {
    const stored = localStorage.getItem('wms_settings');
    if (stored) {
      try {
        form.setFieldsValue(JSON.parse(stored));
      } catch {}
    } else {
      form.setFieldsValue({
        apiBase: 'http://localhost:8888',
        pollInterval: 5000,
        lowStockThreshold: 5,
        darkMode: false,
      });
    }
  }, [form]);

  const onValuesChange = (_, allValues: any) => {
    localStorage.setItem('wms_settings', JSON.stringify(allValues));
    message.success('设置已保存');
  };

  return (
    <Card title="系统设置" bordered>
      <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
        <Form.Item name="apiBase" label="后端API地址" rules={[{ required: true, message: '请输入API地址' }]}> 
          <Input placeholder="http://localhost:8888" />
        </Form.Item>
        <Form.Item name="pollInterval" label="轮询间隔(ms)" rules={[{ type: 'number', min: 1000 }]}> 
          <InputNumber style={{ width: '100%' }} min={1000} max={60000} />
        </Form.Item>
        <Form.Item name="lowStockThreshold" label="低库存阈值" rules={[{ type: 'number', min: 0 }]}> 
          <InputNumber style={{ width: '100%' }} min={0} max={1000} />
        </Form.Item>
        <Form.Item name="darkMode" label="深色模式" valuePropName="checked"> 
          <Switch />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Settings;

