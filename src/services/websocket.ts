import { io, Socket } from 'socket.io-client';
import { InventoryUpdateMessage } from '../types/inventory';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8888';
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection-status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection-status', { connected: false, reason });
      
      if (reason === 'io server disconnect') {
        // 服务器主动断开，需要手动重连
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection-error', { error, attempts: this.reconnectAttempts });
    });

    // 监听库存更新事件
    this.socket.on('inventory-update', (data: InventoryUpdateMessage) => {
      this.emit('inventory-update', data);
    });

    // 监听价格更新事件
    this.socket.on('price-update', (data: InventoryUpdateMessage) => {
      this.emit('price-update', data);
    });

    // 监听新商品事件
    this.socket.on('new-product', (data: InventoryUpdateMessage) => {
      this.emit('new-product', data);
    });
  }

  // 添加事件监听器
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  // 移除事件监听器
  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // 触发事件
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // 发送消息
  emitMessage(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, message not sent:', event, data);
    }
  }

  // 手动重连
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.setupSocket();
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      attempts: this.reconnectAttempts,
    };
  }
}

export const websocketService = new WebSocketService();
export default websocketService;