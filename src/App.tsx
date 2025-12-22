import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, message } from 'antd';
import { zhCN } from 'antd/locale';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import AIAnalysis from './pages/AIAnalysis';
import OperationLogs from './pages/OperationLogs';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useInventoryStore } from './stores/inventoryStore';
import { websocketService } from './services/websocket';
import './App.css';

const { Content } = Layout;

function App() {
  const initializeWebSocket = useInventoryStore(state => state.initializeWebSocket);

  useEffect(() => {
    // 初始化WebSocket连接
    initializeWebSocket();
    
    // 监听连接状态
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

    return () => {
      websocketService.disconnect();
    };
  }, [initializeWebSocket]);

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
          <Header />
          <Content style={{ 
            margin: '24px 16px', 
            padding: 24, 
            background: '#fff',
            minHeight: 'calc(100vh - 112px)',
          }} className="app-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/ai-analysis" element={<AIAnalysis />} />
              <Route path="/operation-logs" element={<OperationLogs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
