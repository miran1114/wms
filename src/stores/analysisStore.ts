import { create } from 'zustand';
import { AIAnalysisResult, AIAnalysisRequest } from '../types/analysis';
import { InventoryItem } from '../types/inventory';
import { apiService } from '../services/api';
import { ollamaService } from '../services/ollama';

interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  result: AIAnalysisResult | null;
  error: string | null;
  contextInventory: InventoryItem[];
  
  // Actions
  startAnalysis: (data: AIAnalysisRequest) => Promise<void>;
  startGlobalAnalysis: () => Promise<void>;
  triggerInventoryAnalysis: () => Promise<void>;
  triggerPricingUpdate: () => Promise<void>;
  clearResult: () => void;
  setError: (error: string | null) => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  isAnalyzing: false,
  progress: 0,
  result: null,
  error: null,
  contextInventory: [],

  startAnalysis: async (data: AIAnalysisRequest) => {
    set({ isAnalyzing: true, progress: 0, error: null });
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    
    try {
      // 模拟进度更新
      progressInterval = setInterval(() => {
        const currentProgress = get().progress;
        if (currentProgress < 90) {
          set({ progress: currentProgress + 10 });
        }
      }, 200);

      // 执行AI分析
      const result = await ollamaService.analyzeInventory(data);
      
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        result, 
        progress: 100,
        isAnalyzing: false,
        contextInventory: data.inventoryData
      });
      
      // 2秒后重置进度
      setTimeout(() => {
        set({ progress: 0 });
      }, 2000);
      
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        error: error instanceof Error ? error.message : 'AI分析失败',
        isAnalyzing: false,
        progress: 0
      });
    }
  },

  startGlobalAnalysis: async () => {
    set({ isAnalyzing: true, progress: 0, error: null });
    let progressInterval: any;
    try {
      progressInterval = setInterval(() => {
        const currentProgress = get().progress;
        if (currentProgress < 90) {
          set({ progress: currentProgress + 10 });
        }
      }, 200);

      const allInventory = await apiService.getInventoryAll();
      const result = await ollamaService.analyzeInventory({ inventoryData: allInventory, analysisType: 'full' });

      clearInterval(progressInterval);
      set({ result, progress: 100, isAnalyzing: false, contextInventory: allInventory });
      setTimeout(() => set({ progress: 0 }), 2000);
    } catch (error) {
      clearInterval(progressInterval);
      set({ error: error instanceof Error ? error.message : 'AI分析失败', isAnalyzing: false, progress: 0 });
    }
  },

  triggerInventoryAnalysis: async () => {
    set({ isAnalyzing: true, progress: 0, error: null });
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    
    try {
      // 模拟进度
      progressInterval = setInterval(() => {
        const currentProgress = get().progress;
        if (currentProgress < 80) {
          set({ progress: currentProgress + 20 });
        }
      }, 300);

      const result = await apiService.triggerInventoryAnalysis();
      
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        progress: 100,
        isAnalyzing: false 
      });
      
      setTimeout(() => {
        set({ progress: 0 });
      }, 2000);
      
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        error: error instanceof Error ? error.message : '库存分析失败',
        isAnalyzing: false,
        progress: 0
      });
    }
  },

  triggerPricingUpdate: async () => {
    set({ isAnalyzing: true, progress: 0, error: null });
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    
    try {
      // 模拟进度
      progressInterval = setInterval(() => {
        const currentProgress = get().progress;
        if (currentProgress < 70) {
          set({ progress: currentProgress + 15 });
        }
      }, 250);

      const result = await apiService.triggerPricingUpdate();
      
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        progress: 100,
        isAnalyzing: false 
      });
      
      setTimeout(() => {
        set({ progress: 0 });
      }, 2000);
      
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      set({ 
        error: error instanceof Error ? error.message : '定价更新失败',
        isAnalyzing: false,
        progress: 0
      });
    }
  },

  clearResult: () => {
    set({ result: null, progress: 0 });
  },

  setError: (error) => {
    set({ error });
  },
}));
