// API通用响应类型
export interface APIResponse<T = any> {
  code: number;
  message?: string;
  data: T;
}

// 操作日志类型
export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'AI_ANALYSIS' | 'PRICE_UPDATE' | 'STOCK_UPDATE';
  operationDetail: string;
  createdAt: string;
  ipAddress?: string;
}

// 操作日志筛选选项
export interface LogFilterOptions {
  startTime?: string;
  endTime?: string;
  operationType?: string;
  userId?: string;
}

// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst';
  isActive: boolean;
  lastLogin?: string;
}

// 登录请求和响应
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// 价格历史类型
export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

// 库存历史类型
export interface StockHistory {
  id: string;
  productId: string;
  changeAmount: number;
  operationType: 'in' | 'out';
  operationTime: string;
  operatorId: string;
  location?: string;
}