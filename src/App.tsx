import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import AIAnalysis from './pages/AIAnalysis';
import OperationLogs from './pages/OperationLogs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ForecastDashboard from './pages/ForecastDashboard';
import CustomerAnalysis from './pages/CustomerAnalysis';
import DemandPrediction from './pages/DemandPrediction';
import PolicySandbox from './pages/PolicySandbox';
import ProtectedRoute from './components/ProtectedRoute';
import { useInventoryStore } from './stores/inventoryStore';
import { websocketService } from './services/websocket';
import './App.css';

const { Content } = Layout;

// Check auth directly from localStorage
const checkAuth = () => {
  return !!(localStorage.getItem('access_token') && localStorage.getItem('user'));
};

function App() {
  const initializeWebSocket = useInventoryStore(state => state.initializeWebSocket);
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth);

  useEffect(() => {
    // Re-check auth state on mount
    setIsAuthenticated(checkAuth());
  }, []);

  useEffect(() => {
    // Initialize WebSocket only when authenticated
    if (isAuthenticated) {
      initializeWebSocket();
      
      // Listen to connection status
      websocketService.on('connection-status', (data) => {
        if (data.connected) {
          message.success('实时数据连接已建立');
        } else {
          message.warning('实时数据连接已断开');
        }
      });

      websocketService.on('connection-error', (data) => {
        message.error(`连接错误: ${data.error?.message || '未知错误'}`);
      });
    }

    return () => {
      if (isAuthenticated) {
        websocketService.disconnect();
      }
    };
  }, [initializeWebSocket, isAuthenticated]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div style={{position:'fixed',left:-9999,top:-9999}}>App Loaded</div>
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          {isAuthenticated && <Header />}
          <Content style={{ 
            margin: isAuthenticated ? '24px 16px' : 0, 
            padding: isAuthenticated ? 24 : 0, 
            background: isAuthenticated ? '#fff' : '#f0f2f5',
            minHeight: isAuthenticated ? 'calc(100vh - 112px)' : '100vh',
          }} className="app-content">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/product/:id" element={
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              } />
              <Route path="/ai-analysis" element={
                <ProtectedRoute requiredPermission="view_analytics">
                  <AIAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/operation-logs" element={
                <ProtectedRoute>
                  <OperationLogs />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requiredPermission="manage_users">
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Forecasting routes */}
              <Route path="/forecast" element={
                <ProtectedRoute requiredPermission="view_analytics">
                  <ForecastDashboard />
                </ProtectedRoute>
              } />
              <Route path="/forecast/customers" element={
                <ProtectedRoute requiredPermission="view_analytics">
                  <CustomerAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/forecast/demand" element={
                <ProtectedRoute requiredPermission="view_analytics">
                  <DemandPrediction />
                </ProtectedRoute>
              } />
              <Route path="/forecast/policy" element={
                <ProtectedRoute requiredPermission="view_analytics">
                  <PolicySandbox />
                </ProtectedRoute>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
            </Routes>
          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
