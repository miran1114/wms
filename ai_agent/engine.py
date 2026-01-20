from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from django.conf import settings

try:
    from langchain_community.llms import Ollama
except Exception:  # pragma: no cover
    Ollama = None  # type: ignore


class DecisionEngine:
    """封装与本地 Ollama(Qwen2.5-14b) 的交互，支持库存分析、定价和需求预测。"""

    def _safe_llm(self):
        if Ollama is None:
            return None
        try:
            return Ollama(base_url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL, temperature=0)
        except Exception:
            return None

    def analyze_safety_stock(self, product_data: Dict[str, Any], market_trend: Dict[str, Any]) -> Dict[str, Any]:
        """分析库存安全性并给出建议。

        返回格式: {status: safe|excess|shortage, recommended_min: int, restock_qty: int}
        """
        llm = self._safe_llm()
        prompt = (
            "你是库存分析专家。根据当前库存和市场需求，给出JSON建议。"
            "字段: status(安全/过剩/紧缺), recommended_min, restock_qty。"
            f"产品: {json.dumps(product_data, ensure_ascii=False)}; 市场: {json.dumps(market_trend, ensure_ascii=False)};"
            "只返回JSON，不要多余说明。"
        )
        try:
            if llm:
                text = llm.invoke(prompt)
                return json.loads(text)
        except Exception:
            pass
        # 降级：简单规则
        stock = int(product_data.get("stock", 0))
        demand = int(market_trend.get("demand_index", 50))
        recommended_min = max(20, int(demand * 1.2))
        status = "安全"
        restock = 0
        if stock < recommended_min:
            status = "紧缺"
            restock = recommended_min - stock
        elif stock > recommended_min * 2:
            status = "过剩"
        return {"status": status, "recommended_min": recommended_min, "restock_qty": restock}

    def calculate_dynamic_pricing(
        self, product_cost: float, competitor_price: float, demand_index: int, stock_level: int
    ) -> Dict[str, Any]:
        """根据供需与竞争对手定价推荐最优售价。返回 {recommended_price, reason}"""
        llm = self._safe_llm()
        payload = {
            "product_cost": product_cost,
            "competitor_price": competitor_price,
            "demand_index": demand_index,
            "stock_level": stock_level,
        }
        prompt = (
            "你是定价策略专家。请基于经济学供需与竞价策略给出JSON。"
            "字段: recommended_price(数字), reason(简要中文理由)。"
            f"输入: {json.dumps(payload, ensure_ascii=False)}。只返回JSON。"
        )
        try:
            if llm:
                text = llm.invoke(prompt)
                return json.loads(text)
        except Exception:
            pass
        # 降级规则
        margin_factor = 0.15 + (demand_index - 50) / 100 * 0.2
        price = max(product_cost * (1 + margin_factor), competitor_price * 0.98)
        return {"recommended_price": round(float(price), 2), "reason": "Ollama不可用，采用规则定价"}

    def analyze_demand_forecast(
        self,
        product_data: Dict[str, Any],
        historical_stats: Dict[str, Any],
        user_forecast: float,
        target_month: int
    ) -> Dict[str, Any]:
        """分析需求预测并给出建议。
        
        返回格式: {
            analysis: str,           # 分析说明
            confidence: str,         # 高/中/低
            suggested_adjustment: float,  # 建议调整比例
            risk_factors: list,      # 风险因素
            recommendations: list    # 建议措施
        }
        """
        llm = self._safe_llm()
        payload = {
            "product": product_data,
            "historical_bias_rate": historical_stats.get("avg_bias_rate", 0),
            "historical_mape": historical_stats.get("mape", 0),
            "record_count": historical_stats.get("record_count", 0),
            "user_forecast": user_forecast,
            "target_month": target_month
        }
        prompt = (
            "你是供应链需求预测专家。根据历史偏差率和预测数据分析，给出JSON建议。"
            "字段: analysis(分析说明), confidence(高/中/低), suggested_adjustment(调整比例), "
            "risk_factors(风险因素列表), recommendations(建议列表)。"
            f"输入: {json.dumps(payload, ensure_ascii=False)}。只返回JSON。"
        )
        try:
            if llm:
                text = llm.invoke(prompt)
                return json.loads(text)
        except Exception:
            pass
        
        # 降级规则
        bias_rate = historical_stats.get("avg_bias_rate", 0)
        record_count = historical_stats.get("record_count", 0)
        
        if record_count < 5:
            confidence = "低"
            analysis = "历史数据不足，预测可靠性较低"
        elif abs(bias_rate) < 0.1:
            confidence = "高"
            analysis = "历史预测准确度较高，可参考度高"
        elif abs(bias_rate) < 0.3:
            confidence = "中"
            analysis = "存在一定预测偏差，建议结合市场情况调整"
        else:
            confidence = "低"
            analysis = "历史预测偏差较大，需谨慎参考"
        
        risk_factors = []
        if bias_rate > 0.15:
            risk_factors.append("历史预测偏高，实际提货可能低于预期")
        if bias_rate < -0.15:
            risk_factors.append("历史预测偏低，实际提货可能高于预期")
        if record_count < 10:
            risk_factors.append("历史数据量较少")
        
        recommendations = []
        if abs(bias_rate) > 0.1:
            recommendations.append(f"建议将预测值调整{-bias_rate*100:.1f}%")
        recommendations.append("关注市场动态，及时调整库存策略")
        
        return {
            "analysis": analysis,
            "confidence": confidence,
            "suggested_adjustment": -bias_rate,
            "risk_factors": risk_factors,
            "recommendations": recommendations
        }

    def analyze_inventory_policy(
        self,
        product_data: Dict[str, Any],
        policy_data: Dict[str, Any],
        current_stock: int
    ) -> Dict[str, Any]:
        """分析库存策略执行情况。
        
        返回格式: {
            status: str,              # 正常/警告/紧急
            analysis: str,            # 分析说明
            action_required: bool,    # 是否需要行动
            recommendations: list     # 建议措施
        }
        """
        llm = self._safe_llm()
        payload = {
            "product": product_data,
            "safety_stock": policy_data.get("safety_stock", 0),
            "reorder_point": policy_data.get("reorder_point", 0),
            "target_stock": policy_data.get("target_stock_level", 0),
            "current_stock": current_stock
        }
        prompt = (
            "你是库存管理专家。根据库存策略参数和当前库存，分析执行情况。"
            "字段: status(正常/警告/紧急), analysis(分析说明), action_required(是否需要行动), "
            "recommendations(建议列表)。"
            f"输入: {json.dumps(payload, ensure_ascii=False)}。只返回JSON。"
        )
        try:
            if llm:
                text = llm.invoke(prompt)
                return json.loads(text)
        except Exception:
            pass
        
        # 降级规则
        safety_stock = policy_data.get("safety_stock", 0)
        reorder_point = policy_data.get("reorder_point", 0)
        target_stock = policy_data.get("target_stock_level", 0)
        
        if current_stock < safety_stock:
            return {
                "status": "紧急",
                "analysis": f"当前库存({current_stock})低于安全库存({safety_stock})，需要立即补货",
                "action_required": True,
                "recommendations": [
                    f"立即补货至目标库存水平({target_stock})",
                    "检查供应商交付能力",
                    "考虑临时调整销售策略"
                ]
            }
        elif current_stock < reorder_point:
            return {
                "status": "警告",
                "analysis": f"当前库存({current_stock})低于再订货点({reorder_point})，建议及时补货",
                "action_required": True,
                "recommendations": [
                    f"安排补货至目标库存({target_stock})",
                    "确认供应商交付时间"
                ]
            }
        else:
            return {
                "status": "正常",
                "analysis": f"当前库存({current_stock})处于安全水平",
                "action_required": False,
                "recommendations": ["保持当前库存管理策略"]
            }

    def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """通用AI聊天接口，支持上下文感知。"""
        llm = self._safe_llm()
        
        system_prompt = (
            "你是智能仓储管理系统的AI助手，专业于库存管理、需求预测、定价策略等领域。"
            "请用简洁专业的中文回答用户问题。"
        )
        
        if context:
            context_str = json.dumps(context, ensure_ascii=False, indent=2)
            full_prompt = f"{system_prompt}\n\n当前上下文:\n{context_str}\n\n用户问题: {message}"
        else:
            full_prompt = f"{system_prompt}\n\n用户问题: {message}"
        
        try:
            if llm:
                return llm.invoke(full_prompt)
        except Exception:
            pass
        
        return "AI服务暂时不可用，请稍后再试。如有紧急问题，请联系管理员。"

    def batch_analyze(self, items: List[Dict[str, Any]], analysis_type: str = "inventory") -> List[Dict[str, Any]]:
        """批量分析多个商品。
        
        analysis_type: inventory | pricing | forecast
        """
        results = []
        
        for item in items:
            if analysis_type == "inventory":
                result = self.analyze_safety_stock(
                    item.get("product", {}),
                    item.get("market", {})
                )
            elif analysis_type == "pricing":
                result = self.calculate_dynamic_pricing(
                    item.get("cost_price", 0),
                    item.get("competitor_price", 0),
                    item.get("demand_index", 50),
                    item.get("stock_level", 0)
                )
            elif analysis_type == "forecast":
                result = self.analyze_demand_forecast(
                    item.get("product", {}),
                    item.get("historical_stats", {}),
                    item.get("user_forecast", 0),
                    item.get("target_month", 1)
                )
            else:
                result = {"error": f"未知的分析类型: {analysis_type}"}
            
            results.append({
                "item_id": item.get("id"),
                "result": result
            })
        
        return results
