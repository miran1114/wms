import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
  // 无需鉴权：直接跳转到首页
  useEffect(() => {}, []);
  return <Navigate to="/" replace />;
};

export default Login;

