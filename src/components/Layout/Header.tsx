import React from 'react';
import { Layout, Menu, Badge, Avatar, Dropdown, Button, Space, Tooltip, Tag } from 'antd';
import { 
  BellOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  BarChartOutlined,
  HistoryOutlined,
  RobotOutlined,
  LineChartOutlined,
  TeamOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_CONFIG } from '../../utils/constants';
import { useAuthStore } from '../../stores/authStore';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  // Helper function for permission check
  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.is_admin) return true;
    if (permission === 'view_analytics') return user.can_view_analytics;
    if (permission === 'edit_inventory') return user.can_edit_inventory;
    return false;
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '库存总览',
    },
    {
      key: '/ai-analysis',
      icon: <RobotOutlined />,
      label: 'AI分析',
    },
    {
      key: '/forecast',
      icon: <LineChartOutlined />,
      label: '需求预测',
      children: [
        {
          key: '/forecast',
          icon: <BarChartOutlined />,
          label: '预测仪表板',
        },
        {
          key: '/forecast/customers',
          icon: <TeamOutlined />,
          label: '客户分析',
        },
        {
          key: '/forecast/demand',
          icon: <LineChartOutlined />,
          label: '需求预测',
        },
        {
          key: '/forecast/policy',
          icon: <ExperimentOutlined />,
          label: '策略沙盒',
        },
      ],
    },
    {
      key: '/operation-logs',
      icon: <HistoryOutlined />,
      label: '操作日志',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'settings') {
      navigate('/settings');
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'red',
      manager: 'orange',
      analyst: 'blue',
      operator: 'green',
      viewer: 'default',
    };
    return colors[role] || 'default';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      manager: '经理',
      analyst: '分析师',
      operator: '操作员',
      viewer: '查看者',
    };
    return labels[role] || role;
  };

  return (
    <AntHeader className="app-header responsive-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ 
          fontSize: 20, 
          fontWeight: 'bold', 
          color: '#1890ff',
          marginRight: 48,
          cursor: 'pointer'
        }}
        onClick={() => navigate('/')}
        >
          {APP_CONFIG.NAME}
        </div>
        
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{ 
            flex: 1, 
            border: 'none',
            fontSize: 14
          }}
          className="responsive-menu"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="responsive-header-actions">
        <Tooltip title="通知">
          <Badge count={3} size="small">
            <Button 
              type="text" 
              icon={<BellOutlined />} 
              size="middle"
              className="responsive-button"
            />
          </Badge>
        </Tooltip>

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
          arrow
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 6,
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          className="responsive-user-menu"
          >
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              style={{ marginRight: 8 }}
              src={user?.avatar}
            />
            <Space size={4}>
              <span style={{ fontSize: 14 }}>{user?.username || '用户'}</span>
              {user?.role && (
                <Tag color={getRoleColor(user.role)} style={{ marginLeft: 4 }}>
                  {getRoleLabel(user.role)}
                </Tag>
              )}
            </Space>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;