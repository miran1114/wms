import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Types
export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  customer_type: string;
  type_display: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  region?: string;
  credit_level: number;
  payment_terms: number;
  is_active: boolean;
  demand_count: number;
  created_at: string;
  updated_at: string;
}

export interface DemandHistory {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  customer?: number;
  customer_name?: string;
  date: string;
  year: number;
  month: number;
  actual_qty: number;
  forecast_qty: number;
  unit_price: number;
  category?: string;
  forecast_error: number;
  bias_rate: number;
  absolute_error_pct: number;
  estimated_value: number;
}

export interface ForecastConfig {
  id: number;
  name: string;
  description?: string;
  service_level: number;
  lead_time_days: number;
  review_period_days: number;
  categories: string[];
  is_default: boolean;
  is_active: boolean;
}

export interface DemandForecast {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  customer?: number;
  customer_name?: string;
  forecast_date: string;
  target_month: number;
  target_year: number;
  user_forecast: number;
  predicted_actual: number;
  confidence_lower: number;
  confidence_upper: number;
  bias_rate: number;
  mape: number;
  mae: number;
  historical_records: number;
  seasonal_factor?: number;
  reliability: string;
  reliability_display: string;
  warning?: string;
  created_at: string;
  created_by_name?: string;
}

export interface InventoryPolicy {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  customer?: number;
  customer_name?: string;
  safety_stock: number;
  reorder_point: number;
  target_stock_level: number;
  lead_time_demand: number;
  z_score: number;
  daily_demand: number;
  daily_std_dev: number;
  service_level: number;
  lead_time_days: number;
  calculated_at: string;
}

export interface BiasStats {
  avg_bias_rate: number;
  mape: number;
  mae: number;
  std_error: number;
  record_count: number;
}

export interface DemandTrend {
  year: number;
  month?: number;
  week?: number;
  total_actual: number;
  total_forecast: number;
  forecast_error: number;
  bias_rate: number;
  count: number;
  avg_actual: number;
  avg_forecast: number;
}

export interface SimulationResult {
  service_level: number;
  service_level_pct: number;
  safety_stock: number;
  reorder_point: number;
  target_stock: number;
  stockout_risk: number;
  holding_cost: number;
}

export interface ForecastDashboard {
  counts: {
    customers: number;
    demand_records: number;
    forecasts: number;
    policies: number;
  };
  overall_stats: BiasStats;
  yearly_summary: Array<{
    year: number;
    total_actual: number;
    total_forecast: number;
    record_count: number;
  }>;
  recent_forecasts: DemandForecast[];
}

// API Functions
export const forecastApi = {
  // Dashboard
  getDashboard: async (): Promise<ForecastDashboard> => {
    const response = await axios.get(`${baseURL}/api/forecast/dashboard/`, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  // Customers
  getCustomers: async (params?: {
    search?: string;
    type?: string;
    active?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: Customer[]; total: number }> => {
    const response = await axios.get(`${baseURL}/api/forecast/customers/`, {
      headers: getAuthHeader(),
      params,
    });
    return response.data.data;
  },

  getCustomerById: async (id: number): Promise<Customer> => {
    const response = await axios.get(`${baseURL}/api/forecast/customers/${id}/`, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  getCustomerAnalysis: async (id: number): Promise<{
    customer: Customer;
    bias_stats: BiasStats;
    monthly_trend: DemandTrend[];
    category_breakdown: Array<{ category: string; total_actual: number; total_forecast: number; count: number }>;
    top_products: Array<{ product__sku: string; product__name: string; total_actual: number; total_forecast: number; count: number }>;
  }> => {
    const response = await axios.get(`${baseURL}/api/forecast/customers/${id}/analysis/`, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
    const response = await axios.post(`${baseURL}/api/forecast/customers/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  updateCustomer: async (id: number, data: Partial<Customer>): Promise<Customer> => {
    const response = await axios.patch(`${baseURL}/api/forecast/customers/${id}/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  deleteCustomer: async (id: number): Promise<void> => {
    await axios.delete(`${baseURL}/api/forecast/customers/${id}/`, {
      headers: getAuthHeader(),
    });
  },

  // Demand History
  getDemandHistory: async (params?: {
    product?: number;
    customer?: number;
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: DemandHistory[]; total: number }> => {
    const response = await axios.get(`${baseURL}/api/forecast/demand-history/`, {
      headers: getAuthHeader(),
      params,
    });
    return response.data.data;
  },

  importDemandHistory: async (file: File): Promise<{ created: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${baseURL}/api/forecast/demand-history/import/`, formData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Forecast Config
  getConfigs: async (): Promise<{ list: ForecastConfig[] }> => {
    const response = await axios.get(`${baseURL}/api/forecast/configs/`, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  createConfig: async (data: Partial<ForecastConfig>): Promise<ForecastConfig> => {
    const response = await axios.post(`${baseURL}/api/forecast/configs/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  updateConfig: async (id: number, data: Partial<ForecastConfig>): Promise<ForecastConfig> => {
    const response = await axios.patch(`${baseURL}/api/forecast/configs/${id}/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  // Predictions
  predictDemand: async (data: {
    product_id: number;
    customer_id?: number;
    target_month: number;
    target_year: number;
    user_forecast: number;
    use_seasonal?: boolean;
  }): Promise<{
    forecast_id: number;
    predicted_actual: number;
    confidence_interval: [number, number];
    bias_rate: number;
    mape: number;
    mae: number;
    historical_records: number;
    seasonal_factor?: number;
    warning?: string;
    reliability: string;
  }> => {
    const response = await axios.post(`${baseURL}/api/forecast/predict/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  batchPredictDemand: async (predictions: Array<{
    product_id: number;
    customer_id?: number;
    target_month: number;
    user_forecast: number;
  }>): Promise<{ predictions: any[]; count: number }> => {
    const response = await axios.post(`${baseURL}/api/forecast/predict/batch/`, { predictions }, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  // Inventory Policy
  calculatePolicy: async (data: {
    product_id: number;
    customer_id?: number;
    service_level?: number;
    lead_time_days?: number;
    review_period_days?: number;
  }): Promise<{
    policy_id: number;
    daily_demand: number;
    daily_std_dev: number;
    safety_stock: number;
    reorder_point: number;
    target_stock_level: number;
    lead_time_demand: number;
    z_score: number;
  }> => {
    const response = await axios.post(`${baseURL}/api/forecast/policy/calculate/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  simulateServiceLevel: async (data: {
    product_id: number;
    customer_id?: number;
    lead_time_days?: number;
    holding_cost_per_unit?: number;
    service_levels?: number[];
  }): Promise<{
    daily_demand: number;
    daily_std_dev: number;
    lead_time_days: number;
    simulation: SimulationResult[];
  }> => {
    const response = await axios.post(`${baseURL}/api/forecast/policy/simulate/`, data, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  // Analytics
  getBiasAnalysis: async (params?: {
    product?: number;
    customer?: number;
  }): Promise<{
    overall: BiasStats;
    seasonal_factors: Record<number, number>;
  }> => {
    const response = await axios.get(`${baseURL}/api/forecast/analytics/bias/`, {
      headers: getAuthHeader(),
      params,
    });
    return response.data.data;
  },

  getDemandTrend: async (params?: {
    product?: number;
    customer?: number;
    groupBy?: 'month' | 'year' | 'week';
    year?: number;
    category?: string;
  }): Promise<{
    trend: DemandTrend[];
    group_by: string;
  }> => {
    const response = await axios.get(`${baseURL}/api/forecast/analytics/trend/`, {
      headers: getAuthHeader(),
      params,
    });
    return response.data.data;
  },
};

export default forecastApi;
