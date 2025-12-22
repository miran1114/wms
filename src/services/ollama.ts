import { Ollama } from 'ollama';
import { AIAnalysisResult, AIAnalysisRequest } from '../types/analysis';
import { InventoryItem } from '../types/inventory';

class OllamaService {
  private ollama: Ollama;
  private model: string;

  constructor() {
    this.ollama = new Ollama({
      host: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
    });
    this.model = import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:14b';
  }

  async analyzeInventory(data: AIAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      const prompt = this.generateAnalysisPrompt(data.inventoryData, data.analysisType);
      
      const response = await this.ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0, top_p: 1, seed: 42 },
      });

      return this.parseAnalysisResponse(response.message.content);
    } catch (error) {
      console.error('Ollama analysis error:', error);
      throw new Error('AI分析失败，请稍后重试');
    }
  }

  private generateAnalysisPrompt(inventoryData: InventoryItem[], analysisType: string): string {
    const totalItems = inventoryData.length;
    const lowStockItems = inventoryData.filter(item => item.lowStockWarning).length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.stock * item.price), 0);
    
    let prompt = `请作为库存管理专家，分析以下库存数据：

库存概况：
- 商品总数：${totalItems}
- 低库存商品数：${lowStockItems}
- 库存总价值：¥${totalValue.toFixed(2)}

商品详情：
${inventoryData.map(item => `
商品：${item.name}
ID：${item.id}
SKU：${item.sku ?? ''}
库存：${item.stock} ${item.unit}
价格：¥${item.price}
${item.lowStockWarning ? '⚠️ 低库存警告' : '库存正常'}
`).join('\n')}

请提供以下分析：
1. 库存周转率分析
2. 定价合理性评估
3. 补货建议
4. 促销推荐

请以JSON格式返回分析结果，包含以下字段：
- turnoverRate: { chartData: [{date, rate}], average }
- priceAnalysis: { reasonable: boolean, suggestions: string[] }
- restockSuggestions: [{productId, suggestedQuantity, reason}]  // productId 必须是上面提供的 ID
- promotionRecommendations: [{productId, discount, reason}]      // discount 为最终售价系数，如 0.9 表示在当前价格基础上打9折

注意：请确保JSON格式正确，折扣以小数表示（如0.9表示9折）。`;

    if (analysisType === 'pricing') {
      prompt += '\n\n重点关注定价策略分析。';
    } else if (analysisType === 'stock') {
      prompt += '\n\n重点关注库存优化建议。';
    }

    return prompt;
  }

  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果无法提取JSON，返回默认结构
      return {
        turnoverRate: {
          chartData: [],
          average: 0,
        },
        priceAnalysis: {
          reasonable: true,
          suggestions: ['无法解析AI分析结果'],
        },
        restockSuggestions: [],
        promotionRecommendations: [],
      };
    } catch (error) {
      console.error('Parse analysis response error:', error);
      return {
        turnoverRate: {
          chartData: [],
          average: 0,
        },
        priceAnalysis: {
          reasonable: true,
          suggestions: ['分析结果解析失败'],
        },
        restockSuggestions: [],
        promotionRecommendations: [],
      };
    }
  }

  async generateProductDescription(product: InventoryItem): Promise<string> {
    try {
      const prompt = `请为以下商品生成一个吸引人的中文描述：

商品名称：${product.name}
库存数量：${product.stock} ${product.unit}
价格：¥${product.price}
${product.category ? `分类：${product.category}` : ''}

请生成一个简洁、专业的商品描述，突出商品特点和价值。`;

      const response = await this.ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: { temperature: 0, top_p: 1, seed: 42 },
      });

      return response.message.content;
    } catch (error) {
      console.error('Generate description error:', error);
      return `${product.name}，库存${product.stock}${product.unit}，售价¥${product.price}。`;
    }
  }

  async checkModelAvailability(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      return models.models.some(model => model.name === this.model);
    } catch (error) {
      console.error('Check model availability error:', error);
      return false;
    }
  }

  getCurrentModel(): string {
    return this.model;
  }

  setModel(model: string) {
    this.model = model;
  }
}

export const ollamaService = new OllamaService();
export default ollamaService;
