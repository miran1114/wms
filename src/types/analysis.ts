// AI分析结果类型
export interface AIAnalysisResult {
  turnoverRate: {
    chartData: Array<{ date: string; rate: number }>;
    average: number;
  };
  priceAnalysis: {
    reasonable: boolean;
    suggestions: string[];
  };
  restockSuggestions: Array<{
    productId: string;
    suggestedQuantity: number;
    reason: string;
  }>;
  promotionRecommendations: Array<{
    productId: string;
    discount: number;
    reason: string;
  }>;
}

// AI分析请求类型
export interface AIAnalysisRequest {
  inventoryData: InventoryItem[];
  analysisType: 'full' | 'pricing' | 'stock';
}

// AI分析状态
export interface AIAnalysisState {
  isAnalyzing: boolean;
  progress: number;
  result: AIAnalysisResult | null;
  error: string | null;
}