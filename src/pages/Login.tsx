import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

const Login: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [form] = Form.useForm();
  const authDebug = sessionStorage.getItem('auth_debug');
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const isAuthed = !!token && !!userStr;

  if (isAuthed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            borderRadius: 12,
          }}
          bordered={false}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 8, color: '#1890ff' }}>
              已检测到登录状态
            </Title>
            <Text type="secondary">请选择继续进入系统或清除会话重新登录</Text>
          </div>

          <Alert
            type="info"
            showIcon
            message="当前会话"
            description={`token=${token ? 'present' : 'missing'} | user=${userStr ? 'present' : 'missing'}`}
            style={{ marginBottom: 16 }}
          />

          <Button
            type="primary"
            block
            style={{ height: 44, marginBottom: 12 }}
            onClick={() => window.location.href = '/'}
          >
            进入系统
          </Button>
          <Button
            danger
            block
            style={{ height: 44 }}
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              sessionStorage.removeItem('auth_debug');
              window.location.reload();
            }}
          >
            清除会话并重新登录
          </Button>
        </Card>
      </div>
    );
  }

  const handleLogin = async (values: LoginFormData) => {
    try {
      console.log('[Login] Starting login...');
      await login(values.username, values.password);
      console.log('[Login] Login completed');
      console.log('[Login] Token in localStorage:', !!localStorage.getItem('access_token'));
      message.success('Login successful!');
      
      // Small delay to ensure localStorage is written
      setTimeout(() => {
        console.log('[Login] Redirecting to /');
        window.location.href = '/';
      }, 100);
    } catch (err: any) {
      console.error('[Login] Error:', err);
      message.error(err?.response?.data?.detail || 'Login failed');
    }
  };

  const handleRegister = async (values: RegisterFormData) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/auth/register/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      const data = await response.json();
      
      if (data.code === 0) {
        message.success('注册成功，请登录');
        setIsRegisterMode(false);
        form.resetFields();
      } else {
        message.error(data.message || '注册失败');
      }
    } catch (err) {
      message.error('注册失败，请稍后重试');
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    form.resetFields();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          borderRadius: 12,
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8, color: '#1890ff' }}>
            智能仓储管理系统
          </Title>
          <Text type="secondary">
            {isRegisterMode ? '创建新账户' : '欢迎回来，请登录您的账户'}
          </Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="Auth debug"
          description={`token=${token ? 'present' : 'missing'} | user=${userStr ? 'present' : 'missing'} | debug=${authDebug || 'none'}`}
          style={{ marginBottom: 16 }}
        />

        {authDebug && (
          <Alert
            type="warning"
            showIcon
            message="Auth redirect debug"
            description={authDebug}
            style={{ marginBottom: 16 }}
          />
        )}

        {!isRegisterMode ? (
          // Login Form
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                style={{ height: 44 }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        ) : (
          // Register Form
          <Form
            form={form}
            name="register"
            onFinish={handleRegister}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="邮箱"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item
              name="password_confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                style={{ height: 44 }}
              >
                注册
              </Button>
            </Form.Item>
          </Form>
        )}

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isRegisterMode ? '已有账户？' : '还没有账户？'}
          </Text>
        </Divider>

        <Button
          type="link"
          onClick={toggleMode}
          block
          style={{ marginTop: -8 }}
        >
          {isRegisterMode ? '返回登录' : '注册新账户'}
        </Button>
      </Card>
    </div>
  );
};

export default Login;

