import { create } from 'zustand';
import { InventoryItem, FilterOptions, PaginatedResponse } from '../types/inventory';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';

interface InventoryState {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // Actions
  setFilters: (filters: FilterOptions) => void;
  setPagination: (pagination: Partial<InventoryState['pagination']>) => void;
  fetchInventory: () => Promise<void>;
  updateStock: (id: string, change: number, operation: 'increase' | 'decrease') => Promise<boolean>;
  updatePrice: (id: string, price: number) => Promise<boolean>;
  createProduct: (productData: Partial<InventoryItem>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  handleRealtimeUpdate: (data: any) => void;
  initializeWebSocket: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventory: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },

  setFilters: (filters) => {
    set({ filters, pagination: { ...get().pagination, current: 1 } });
    get().fetchInventory();
  },

  setPagination: (pagination) => {
    set({ pagination: { ...get().pagination, ...pagination } });
    get().fetchInventory();
  },

  fetchInventory: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response: PaginatedResponse<InventoryItem> = await apiService.getInventoryList({
        ...filters,
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      
      set({
        inventory: response.list,
        pagination: {
          ...pagination,
          total: response.total,
        },
        loading: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取库存数据失败',
        loading: false 
      });
    }
  },

  updateStock: async (id: string, change: number, operation: 'increase' | 'decrease') => {
    set({ loading: true, error: null });
    try {
      await apiService.updateStock(id, {
        change: Math.abs(change),
        operation,
        reason: `${operation === 'increase' ? '增加' : '减少'}库存 ${change}${operation === 'increase' ? '' : ''}`,
      });
      
      // 服务端为准，重新拉取
      await get().fetchInventory();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新库存失败',
        loading: false 
      });
      return false;
    }
  },

  updatePrice: async (id: string, price: number) => {
    set({ loading: true, error: null });
    try {
      await apiService.updatePrice(id, { price, reason: '价格调整' });
      
      await get().fetchInventory();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新价格失败',
        loading: false 
      });
      return false;
    }
  },

  createProduct: async (productData: Partial<InventoryItem>) => {
    set({ loading: true, error: null });
    try {
      await apiService.createProduct(productData);
      await get().fetchInventory(); // 重新获取数据
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '创建商品失败',
        loading: false 
      });
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteProduct(id);
      const { inventory } = get();
      set({ inventory: inventory.filter(item => item.id !== id), loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除商品失败',
        loading: false 
      });
    }
  },

  handleRealtimeUpdate: (data: any) => {
    const { inventory } = get();
    const { type, productId, data: updateData } = data;
    
    const updatedInventory = inventory.map(item => 
      item.id === productId ? { ...item, ...updateData } : item
    );
    
    set({ inventory: updatedInventory });
  },

  initializeWebSocket: () => {
    websocketService.on('inventory-update', get().handleRealtimeUpdate);
    websocketService.on('price-update', get().handleRealtimeUpdate);
    websocketService.on('new-product', () => get().fetchInventory());
  },
}));
