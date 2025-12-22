// 商品库存类型
export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
  lastUpdated: string;
  lowStockWarning: boolean;
  category?: string;
  sku?: string;
  location?: string;
  minSafetyStock?: number;
  maxCapacity?: number;
}

// 库存更新消息类型
export interface InventoryUpdateMessage {
  type: 'STOCK_UPDATE' | 'PRICE_UPDATE' | 'NEW_PRODUCT';
  productId: string;
  data: Partial<InventoryItem>;
  timestamp: string;
}

// 库存操作类型
export interface StockOperationData {
  change: number;
  operation: 'increase' | 'decrease';
  reason?: string;
}

// 价格更新类型
export interface PriceUpdateData {
  price: number;
  reason?: string;
}

// 库存筛选选项
export interface FilterOptions {
  search?: string;
  sortBy?: 'stock' | 'price' | 'updateTime' | 'name';
  sortOrder?: 'asc' | 'desc';
  category?: string;
  lowStockOnly?: boolean;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}