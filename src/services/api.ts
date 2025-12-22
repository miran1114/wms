import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  InventoryItem, 
  FilterOptions, 
  PaginatedResponse,
  StockOperationData,
  PriceUpdateData 
} from '../types/inventory';
import { 
  AIAnalysisRequest, 
  AIAnalysisResult 
} from '../types/analysis';
import { 
  APIResponse, 
  OperationLog, 
  LogFilterOptions,
  PriceHistory,
  StockHistory
} from '../types/api';

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<APIResponse>) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // 库存管理API
  async getInventoryList(filters?: FilterOptions): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await this.client.get<APIResponse<PaginatedResponse<InventoryItem>>>(
      `/api/inventory?${params.toString()}`
    );
    return response.data.data;
  }

  async getInventoryAll(): Promise<InventoryItem[]> {
    const response = await this.client.get<APIResponse<PaginatedResponse<InventoryItem>>>(
      `/api/inventory?all=1`
    );
    return response.data.data.list;
  }

  async updateStock(id: string, data: StockOperationData): Promise<void> {
    await this.client.put<APIResponse>(`/api/inventory/${id}/stock`, data);
  }

  async updatePrice(id: string, data: PriceUpdateData): Promise<void> {
    await this.client.put<APIResponse>(`/api/inventory/${id}/price`, data);
  }

  async createProduct(productData: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await this.client.post<APIResponse<InventoryItem>>('/api/inventory', productData);
    return response.data.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.client.delete<APIResponse>(`/api/inventory/${id}`);
  }

  // AI分析API
  async getAIAnalysis(data: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const response = await this.client.post<APIResponse<AIAnalysisResult>>('/api/ai-analysis', data);
    return response.data.data;
  }

  async triggerInventoryAnalysis(): Promise<any> {
    const response = await this.client.post<APIResponse>('/api/ai/analyze-inventory/');
    return response.data.data;
  }

  async triggerPricingUpdate(): Promise<any> {
    const response = await this.client.post<APIResponse>('/api/ai/update-pricing/');
    return response.data.data;
  }

  // 操作日志API
  async getOperationLogs(filters?: LogFilterOptions): Promise<PaginatedResponse<OperationLog>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await this.client.get<APIResponse<PaginatedResponse<OperationLog>>>(
      `/api/logs?${params.toString()}`
    );
    return response.data.data;
  }

  // 价格历史API
  async getPriceHistory(productId: string): Promise<PriceHistory[]> {
    const response = await this.client.get<APIResponse<PriceHistory[]>>(`/api/inventory/${productId}/price-history`);
    return response.data.data;
  }

  // 库存历史API
  async getStockHistory(productId: string): Promise<StockHistory[]> {
    const response = await this.client.get<APIResponse<StockHistory[]>>(`/api/inventory/${productId}/stock-history`);
    return response.data.data;
  }

  // 仪表板API
  async getDashboard(): Promise<any> {
    const response = await this.client.get<APIResponse>('/api/dashboard/');
    return response.data.data;
  }
}

export const apiService = new APIService();
export default apiService;
