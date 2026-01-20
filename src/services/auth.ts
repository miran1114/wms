import axios, { AxiosInstance } from 'axios';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  role_display: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  avatar?: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    role_display: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    is_admin: boolean;
    can_edit_inventory: boolean;
    can_view_analytics: boolean;
  };
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  phone?: string;
  department?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface LoginHistory {
  id: number;
  username: string;
  login_at: string;
  ip_address: string;
  success: boolean;
  failure_reason?: string;
}

class AuthService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    console.log('[AuthService] Attempting login for:', username);
    const response = await this.client.post<LoginResponse>('/api/auth/login/', {
      username,
      password,
    });
    
    console.log('[AuthService] Login response received');
    console.log('[AuthService] Access token:', response.data.access ? 'present' : 'missing');
    console.log('[AuthService] User:', response.data.user?.username);
    
    // Store tokens
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    // Verify storage
    console.log('[AuthService] Token stored:', !!localStorage.getItem('access_token'));
    console.log('[AuthService] User stored:', !!localStorage.getItem('user'));
    
    return response.data;
  }

  async register(data: RegisterData): Promise<{ code: number; message: string; data: User }> {
    const response = await this.client.post('/api/auth/register/', data);
    return response.data;
  }

  async refreshToken(): Promise<{ access: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.client.post<{ access: string }>('/api/auth/refresh/', {
      refresh: refreshToken,
    });
    
    localStorage.setItem('access_token', response.data.access);
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<{ code: number; data: User }>('/api/auth/me/', {
      headers: this.getAuthHeader(),
    });
    return response.data.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.client.put<{ code: number; data: User }>('/api/auth/me/update/', data, {
      headers: this.getAuthHeader(),
    });
    return response.data.data;
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await this.client.post('/api/auth/me/password/', data, {
      headers: this.getAuthHeader(),
    });
  }

  async getUsers(params?: { role?: string; search?: string }): Promise<{ list: User[]; total: number }> {
    const response = await this.client.get<{ code: number; data: { list: User[]; total: number } }>('/api/auth/users/', {
      headers: this.getAuthHeader(),
      params,
    });
    return response.data.data;
  }

  async getUserById(id: number): Promise<User> {
    const response = await this.client.get<{ code: number; data: User }>(`/api/auth/users/${id}/`, {
      headers: this.getAuthHeader(),
    });
    return response.data.data;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const response = await this.client.patch<{ code: number; data: User }>(`/api/auth/users/${id}/`, data, {
      headers: this.getAuthHeader(),
    });
    return response.data.data;
  }

  async deleteUser(id: number): Promise<void> {
    await this.client.delete(`/api/auth/users/${id}/`, {
      headers: this.getAuthHeader(),
    });
  }

  async getLoginHistory(): Promise<{ list: LoginHistory[]; total: number }> {
    const response = await this.client.get<{ code: number; data: { list: LoginHistory[]; total: number } }>('/api/auth/login-history/', {
      headers: this.getAuthHeader(),
    });
    return response.data.data;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getStoredUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

export const authService = new AuthService();
export default authService;
