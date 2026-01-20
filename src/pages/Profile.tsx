import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Tabs,
  Table,
  Tag,
  Space,
  message,
  Divider,
  Row,
  Col,
  Statistic,
  Modal,
  Select,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  LockOutlined,
  HistoryOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import authService, { LoginHistory, User } from '../services/auth';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUserModal, setEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm] = Form.useForm();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      const updated = await authService.updateProfile(values);
      updateUser(updated);
      message.success('个人资料更新成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      await authService.changePassword(values);
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLoginHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await authService.getLoginHistory();
      setLoginHistory(data.list);
    } catch (error) {
      message.error('加载登录历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!user?.is_admin) return;
    setUsersLoading(true);
    try {
      const data = await authService.getUsers();
      setUsers(data.list);
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleEditUser = (record: User) => {
    setSelectedUser(record);
    userForm.setFieldsValue(record);
    setEditUserModal(true);
  };

  const handleUpdateUser = async (values: any) => {
    if (!selectedUser) return;
    try {
      await authService.updateUser(selectedUser.id, values);
      message.success('用户更新成功');
      setEditUserModal(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await authService.deleteUser(userId);
          message.success('用户删除成功');
          loadUsers();
        } catch (error: any) {
          message.error(error.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const loginHistoryColumns = [
    {
      title: '登录时间',
      dataIndex: 'login_at',
      key: 'login_at',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'failure_reason',
      key: 'failure_reason',
      render: (text: string) => text || '-',
    },
  ];

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role_display',
      key: 'role_display',
      render: (text: string, record: User) => (
        <Tag color={record.role === 'admin' ? 'red' : record.role === 'manager' ? 'orange' : 'blue'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '活跃' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            onClick={() => handleDeleteUser(record.id)}
            disabled={record.id === user?.id}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const roleOptions = [
    { value: 'admin', label: '系统管理员' },
    { value: 'manager', label: '仓库经理' },
    { value: 'analyst', label: '数据分析师' },
    { value: 'operator', label: '操作员' },
    { value: 'viewer', label: '访客' },
  ];

  if (!user) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>
        <UserOutlined /> 个人中心
      </Title>

      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar 
                size={100} 
                icon={<UserOutlined />}
                src={user.avatar}
                style={{ marginBottom: 16, backgroundColor: '#1890ff' }}
              />
              <Title level={4}>{user.username}</Title>
              <Tag color={user.is_admin ? 'red' : 'blue'}>{user.role_display}</Tag>
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text><MailOutlined /> {user.email}</Text>
              </Space>
            </div>
          </Card>
          
          <Card style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="登录次数" 
                  value={loginHistory.length} 
                  prefix={<HistoryOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="账户状态" 
                  value={user.is_admin ? '管理员' : '普通用户'}
                  prefix={<SafetyOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card>
            <Tabs 
              defaultActiveKey="profile"
              onChange={(key) => {
                if (key === 'history') loadLoginHistory();
                if (key === 'users') loadUsers();
              }}
            >
              <TabPane tab="基本信息" key="profile">
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleProfileUpdate}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="username"
                        label="用户名"
                      >
                        <Input prefix={<UserOutlined />} disabled />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="email"
                        label="邮箱"
                      >
                        <Input prefix={<MailOutlined />} disabled />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="first_name"
                        label="名"
                      >
                        <Input placeholder="请输入名字" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="last_name"
                        label="姓"
                      >
                        <Input placeholder="请输入姓氏" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>

              <TabPane tab="修改密码" key="password">
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                  style={{ maxWidth: 400 }}
                >
                  <Form.Item
                    name="old_password"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
                  </Form.Item>
                  <Form.Item
                    name="new_password"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码至少6个字符' },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
                  </Form.Item>
                  <Form.Item
                    name="new_password_confirm"
                    label="确认新密码"
                    dependencies={['new_password']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('new_password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>

              <TabPane tab="登录历史" key="history">
                <Table
                  columns={loginHistoryColumns}
                  dataSource={loginHistory}
                  loading={historyLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>

              {user.is_admin && (
                <TabPane tab="用户管理" key="users">
                  <Table
                    columns={userColumns}
                    dataSource={users}
                    loading={usersLoading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </TabPane>
              )}
            </Tabs>
          </Card>
        </Col>
      </Row>

      <Modal
        title="编辑用户"
        open={editUserModal}
        onCancel={() => setEditUserModal(false)}
        footer={null}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
          >
            <Select
              options={[
                { value: true, label: '活跃' },
                { value: false, label: '禁用' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setEditUserModal(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
