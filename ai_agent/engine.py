from __future__ import annotations

import json
from typing import Any, Dict

from django.conf import settings

try:
    from langchain_community.llms import Ollama
except Exception:  # pragma: no cover
    Ollama = None  # type: ignore


class DecisionEngine:
    """封装与本地 Ollama(Qwen2.5-14b) 的交互。"""

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
