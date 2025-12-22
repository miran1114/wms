// 格式化货币
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
};

// 格式化数字
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN').format(num);
};

// 格式化日期时间
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// 格式化日期
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// 格式化相对时间
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '刚刚';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  } else if (diffInDays < 30) {
    return `${diffInDays}天前`;
  } else {
    return formatDate(dateString);
  }
};

// 格式化库存状态
export const formatStockStatus = (stock: number, minSafetyStock: number = 0): string => {
  if (stock <= 0) {
    return '缺货';
  } else if (stock <= minSafetyStock) {
    return '低库存';
  } else if (stock <= minSafetyStock * 2) {
    return '库存偏低';
  } else {
    return '库存充足';
  }
};

// 获取库存状态颜色
export const getStockStatusColor = (stock: number, minSafetyStock: number = 0): string => {
  if (stock <= 0) {
    return 'red';
  } else if (stock <= minSafetyStock) {
    return 'orange';
  } else if (stock <= minSafetyStock * 2) {
    return 'gold';
  } else {
    return 'green';
  }
};

// 格式化操作类型
export const formatOperationType = (type: string): string => {
  const operationTypeMap: Record<string, string> = {
    'CREATE': '创建',
    'UPDATE': '更新',
    'DELETE': '删除',
    'AI_ANALYSIS': 'AI分析',
    'PRICE_UPDATE': '价格更新',
    'STOCK_UPDATE': '库存更新',
  };
  return operationTypeMap[type] || type;
};

// 格式化百分比
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// 计算库存价值
export const calculateInventoryValue = (stock: number, price: number): number => {
  return stock * price;
};

// 计算库存周转率（简化版）
export const calculateTurnoverRate = (soldQuantity: number, averageStock: number): number => {
  if (averageStock === 0) return 0;
  return soldQuantity / averageStock;
};

// 生成SKU
export const generateSKU = (name: string, category: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const namePart = name.slice(0, 3).toUpperCase();
  const categoryPart = category.slice(0, 2).toUpperCase();
  return `${categoryPart}${namePart}${timestamp}`.slice(0, 10);
};