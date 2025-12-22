import React from 'react';
import { Layout, Menu, Badge, Avatar, Dropdown, Button, Space, Tooltip } from 'antd';
import { 
  BellOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  BarChartOutlined,
  HistoryOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_CONFIG } from '../../utils/constants';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      localStorage.removeItem('token');
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    } else if (key === 'settings') {
      navigate('/settings');
    }
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
            />
            <span style={{ fontSize: 14 }}>管理员</span>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;