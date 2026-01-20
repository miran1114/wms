// API配置
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

// WebSocket配置
export const WS_CONFIG = {
  URL: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
} as const;

// AI模型配置
export const AI_CONFIG = {
  OLLAMA_BASE_URL: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
  DEFAULT_MODEL: import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:14b',
} as const;

// 应用配置
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || '库存管理系统',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// 库存配置
export const INVENTORY_CONFIG = {
  LOW_STOCK_THRESHOLD: 10, // 低库存阈值
  DEFAULT_SAFETY_STOCK: 5, // 默认安全库存
  MAX_STOCK_CAPACITY: 1000, // 最大库存容量
} as const;

// 主题配置
export const THEME_CONFIG = {
  PRIMARY_COLOR: '#1890ff',
  SUCCESS_COLOR: '#52c41a',
  WARNING_COLOR: '#faad14',
  ERROR_COLOR: '#ff4d4f',
  INFO_COLOR: '#1890ff',
} as const;

// 路由配置
export const ROUTE_PATHS = {
  HOME: '/',
  PRODUCT_DETAIL: '/product/:id',
  AI_ANALYSIS: '/ai-analysis',
  OPERATION_LOGS: '/operation-logs',
  SETTINGS: '/settings',
  LOGIN: '/login',
} as const;

// 操作类型
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  AI_ANALYSIS: 'AI_ANALYSIS',
  PRICE_UPDATE: 'PRICE_UPDATE',
  STOCK_UPDATE: 'STOCK_UPDATE',
} as const;

// 排序选项
export const SORT_OPTIONS = [
  { value: 'name', label: '商品名称' },
  { value: 'stock', label: '库存数量' },
  { value: 'price', label: '价格' },
  { value: 'updateTime', label: '更新时间' },
] as const;

// 排序顺序
export const SORT_ORDERS = [
  { value: 'asc', label: '升序' },
  { value: 'desc', label: '降序' },
] as const;

// 库存单位
export const STOCK_UNITS = [
  '件',
  '个',
  '箱',
  '盒',
  '包',
  '袋',
  '瓶',
  '罐',
  '千克',
  '克',
  '米',
  '厘米',
  '升',
  '毫升',
] as const;

// 商品分类
export const PRODUCT_CATEGORIES = [
  '电子产品',
  '服装鞋帽',
  '食品饮料',
  '家居用品',
  '图书文具',
  '运动户外',
  '美妆护肤',
  '母婴用品',
  '汽车用品',
  '办公用品',
  '其他',
] as const;