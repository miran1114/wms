from __future__ import annotations

from typing import Any, Dict, List

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_agent.engine import DecisionEngine
from core.models import OperationLog
from inventory.models import Inventory, Product, Transaction
from market.models import MarketData
from pricing.models import PricingLog


class AnalyzeInventoryView(APIView):
    """触发全量库存的AI安全分析并更新建议字段。"""

    def post(self, request: Request) -> Response:  # type: ignore[override]
        engine = DecisionEngine()
        results: List[Dict[str, Any]] = []
        for inv in Inventory.objects.select_related("product").all():
            latest = MarketData.objects.filter(product=inv.product).order_by("-recorded_at").first()
            market = {
                "demand_index": latest.demand_index if latest else 50,
                "market_price": float(latest.market_price) if latest else float(inv.product.current_selling_price),
            }
            product_data = {
                "sku": inv.product.sku,
                "name": inv.product.name,
                "stock": inv.quantity,
            }
            suggestion = engine.analyze_safety_stock(product_data, market)
            inv.min_safety_stock = int(suggestion.get("recommended_min", inv.min_safety_stock))
            inv.save(update_fields=["min_safety_stock"])
            results.append({"sku": inv.product.sku, "suggestion": suggestion})
        OperationLog.objects.create(
            operation_type="AI_ANALYSIS",
            operation_detail=f"库存安全分析，记录数={len(results)}",
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({"code": 0, "data": {"count": len(results), "results": results}})


class UpdatePricingView(APIView):
    """触发全量动态定价，根据市场数据更新商品价格并记录日志。"""

    def post(self, request: Request) -> Response:  # type: ignore[override]
        engine = DecisionEngine()
        updated: List[Dict[str, Any]] = []
        with transaction.atomic():
            for p in Product.objects.all():
                latest = MarketData.objects.filter(product=p).order_by("-recorded_at").first()
                stock_level = Inventory.objects.filter(product=p).aggregate_total_quantity()
                demand_index = latest.demand_index if latest else 50
                competitor_price = float(latest.competitor_price) if latest else float(p.current_selling_price)
                suggestion = engine.calculate_dynamic_pricing(
                    float(p.cost_price), competitor_price, int(demand_index), int(stock_level)
                )
                old = p.current_selling_price
                new = suggestion.get("recommended_price", float(old))
                p.current_selling_price = new
                p.save(update_fields=["current_selling_price"])
                PricingLog.objects.create(
                    product=p,
                    old_price=old,
                    new_price=new,
                    reason=suggestion.get("reason", "AI定价更新"),
                    created_at=timezone.now(),
                )
                updated.append({"sku": p.sku, "old": float(old), "new": float(new)})
        OperationLog.objects.create(
            operation_type="PRICE_UPDATE",
            operation_detail=f"动态定价更新，影响商品数={len(updated)}",
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({"code": 0, "data": {"count": len(updated), "updated": updated}})


class DashboardView(APIView):
    """返回当前库存总览与紧急补货列表。"""

    def get(self, request: Request) -> Response:  # type: ignore[override]
        overview: List[Dict[str, Any]] = []
        urgent: List[Dict[str, Any]] = []
        for inv in Inventory.objects.select_related("product").all():
            item = {
                "sku": inv.product.sku,
                "name": inv.product.name,
                "quantity": inv.quantity,
                "min_safety_stock": inv.min_safety_stock,
            }
            overview.append(item)
            if inv.quantity < inv.min_safety_stock:
                urgent.append(item)
        return Response({"code": 0, "data": {"total_items": len(overview), "urgent": urgent, "overview": overview}})


class RootView(APIView):
    """根路径说明与可用端点列表。"""

    def get(self, request: Request) -> Response:  # type: ignore[override]
        return Response(
            {
                "code": 0,
                "data": {
                    "message": "WMS API running",
                    "endpoints": [
                        {"method": "POST", "path": "/api/ai/analyze-inventory/"},
                        {"method": "POST", "path": "/api/ai/update-pricing/"},
                        {"method": "GET", "path": "/api/dashboard/"},
                        {"method": "GET", "path": "/api/inventory"},
                        {"method": "POST", "path": "/api/inventory"},
                        {"method": "PUT", "path": "/api/inventory/<id>/stock"},
                        {"method": "PUT", "path": "/api/inventory/<id>/price"},
                        {"method": "DELETE", "path": "/api/inventory/<id>"},
                    ],
                },
            }
        )


def _inventory_item(inv: Inventory) -> Dict[str, Any]:
    latest = MarketData.objects.filter(product=inv.product).order_by("-recorded_at").first()
    last_updated = latest.recorded_at.isoformat() if latest else timezone.now().isoformat()
    return {
        "id": str(inv.product.id),
        "name": inv.product.name,
        "stock": inv.quantity,
        "unit": "件",
        "price": float(inv.product.current_selling_price),
        "lastUpdated": last_updated,
        "lowStockWarning": inv.quantity <= inv.min_safety_stock,
        "category": inv.product.category,
        "sku": inv.product.sku,
        "location": inv.location,
        "minSafetyStock": inv.min_safety_stock,
        "maxCapacity": inv.max_capacity,
    }


class InventoryListView(APIView):
    """库存列表与创建"""

    def get(self, request: Request) -> Response:  # type: ignore[override]
        q = request.query_params
        search = q.get("search")
        sort_by = q.get("sortBy") or "updateTime"
        sort_order = q.get("sortOrder") or "desc"
        page = int(q.get("page") or 1)
        page_size = int(q.get("pageSize") or 20)
        return_all = str(q.get("all") or "").lower() in {"1", "true", "yes"}

        qs = Inventory.objects.select_related("product").all()
        if search:
            s = str(search).strip()
            q_obj = Q(product__name__icontains=s) | Q(product__sku__icontains=s)
            if s.isdigit():
                q_obj = q_obj | Q(product__id=int(s))
            qs = qs.filter(q_obj)

        items = [_inventory_item(inv) for inv in qs]
        if sort_by == "stock":
            items.sort(key=lambda x: x["stock"], reverse=(sort_order == "desc"))
        elif sort_by == "price":
            items.sort(key=lambda x: x["price"], reverse=(sort_order == "desc"))
        elif sort_by == "name":
            items.sort(key=lambda x: x["name"], reverse=(sort_order == "desc"))
        else:  # updateTime
            items.sort(key=lambda x: x["lastUpdated"], reverse=(sort_order == "desc"))

        total = len(items)
        if return_all:
            return Response({"code": 0, "data": {"list": items, "total": total, "page": 1, "pageSize": total}})
        else:
            start = (page - 1) * page_size
            end = start + page_size
            page_items = items[start:end]
            return Response({"code": 0, "data": {"list": page_items, "total": total, "page": page, "pageSize": page_size}})

    def post(self, request: Request) -> Response:  # type: ignore[override]
        data = request.data
        p = Product.objects.create(
            sku=data.get("sku") or f"SKU{timezone.now().timestamp():.0f}",
            name=data.get("name"),
            category=data.get("category") or "其他",
            cost_price=data.get("cost_price") or 0,
            current_selling_price=data.get("price") or 0,
        )
        Inventory.objects.create(
            product=p,
            quantity=int(data.get("stock") or 0),
            location=data.get("location") or "MAIN",
            min_safety_stock=int(data.get("minSafetyStock") or 0),
            max_capacity=int(data.get("maxCapacity") or 0),
        )
        return Response({"code": 0, "data": _inventory_item(Inventory.objects.get(product=p))})


class InventoryStockUpdateView(APIView):
    """库存增减"""

    def put(self, request: Request, pk: int) -> Response:  # type: ignore[override]
        data = request.data
        change = int(abs(int(data.get("change") or 0)))
        operation = data.get("operation")
        inv = Inventory.objects.select_related("product").get(product_id=pk)
        if operation == "increase":
            inv.quantity += change
            Transaction.objects.create(product=inv.product, quantity=change, kind=Transaction.KIND_IN)
        else:
            inv.quantity = max(0, inv.quantity - change)
            Transaction.objects.create(product=inv.product, quantity=change, kind=Transaction.KIND_OUT)
        inv.save(update_fields=["quantity"])
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else "system",
            username=request.user.username if request.user.is_authenticated else "系统",
            operation_type="STOCK_UPDATE",
            operation_detail=f"商品ID={pk} {operation} {change}",
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({"code": 0, "data": _inventory_item(inv)})


class InventoryPriceUpdateView(APIView):
    """价格更新"""

    def put(self, request: Request, pk: int) -> Response:  # type: ignore[override]
        data = request.data
        price = float(data.get("price") or 0)
        p = Product.objects.get(id=pk)
        old = p.current_selling_price
        p.current_selling_price = price
        p.save(update_fields=["current_selling_price"])
        PricingLog.objects.create(product=p, old_price=old, new_price=price, reason=data.get("reason") or "价格调整")
        inv = Inventory.objects.get(product=p)
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else "system",
            username=request.user.username if request.user.is_authenticated else "系统",
            operation_type="PRICE_UPDATE",
            operation_detail=f"商品ID={pk} 改价 {float(old)} -> {price}",
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({"code": 0, "data": _inventory_item(inv)})


class InventoryDeleteView(APIView):
    """删除商品"""

    def delete(self, request: Request, pk: int) -> Response:  # type: ignore[override]
        Product.objects.filter(id=pk).delete()
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else "system",
            username=request.user.username if request.user.is_authenticated else "系统",
            operation_type="DELETE",
            operation_detail=f"删除商品ID={pk}",
            ip_address=request.META.get("REMOTE_ADDR", ""),
        )
        return Response({"code": 0, "data": {"deleted": True}})


class OperationLogsView(APIView):
    def get(self, request: Request) -> Response:  # type: ignore[override]
        q = request.query_params
        start = q.get("startTime")
        end = q.get("endTime")
        op_type = q.get("operationType")
        user_id = q.get("userId")
        page = int(q.get("page") or 1)
        page_size = int(q.get("pageSize") or 20)

        logs = OperationLog.objects.all()
        if op_type:
            logs = logs.filter(operation_type=op_type)
        if user_id:
            logs = logs.filter(user_id=user_id)
        if start:
            logs = logs.filter(created_at__gte=start)
        if end:
            logs = logs.filter(created_at__lte=end)

        total = logs.count()
        start_idx = (page - 1) * page_size
        page_logs = logs[start_idx : start_idx + page_size]
        data = [
            {
                "id": str(l.id),
                "userId": l.user_id,
                "username": l.username,
                "operationType": l.operation_type,
                "operationDetail": l.operation_detail,
                "createdAt": l.created_at.isoformat(),
                "ipAddress": l.ip_address or "",
            }
            for l in page_logs
        ]
        return Response({"code": 0, "data": {"list": data, "total": total, "page": page, "pageSize": page_size}})


class PriceHistoryView(APIView):
    def get(self, request: Request, pk: int) -> Response:  # type: ignore[override]
        logs = PricingLog.objects.filter(product_id=pk).order_by("created_at")
        data = [{"date": l.created_at.date().isoformat(), "price": float(l.new_price)} for l in logs]
        return Response({"code": 0, "data": data})


class StockHistoryView(APIView):
    def get(self, request: Request, pk: int) -> Response:  # type: ignore[override]
        inv = Inventory.objects.select_related("product").get(product_id=pk)
        txs = Transaction.objects.filter(product_id=pk).order_by("created_at")
        # 以天为单位汇总并计算逐日库存
        from collections import defaultdict
        daily = defaultdict(lambda: 0)
        for t in txs:
            day = t.created_at.date().isoformat()
            daily[day] += -t.quantity if t.kind == Transaction.KIND_OUT else t.quantity
        # 从最早到今天累计
        days_sorted = sorted(daily.keys())
        running = inv.quantity
        # 为了展示历史，反推从今天向前的累计值：这里简单用当前库存减回去
        series = []
        for d in reversed(days_sorted):
            series.append({"date": d, "stock": running})
            running -= daily[d]
        series.reverse()
        return Response({"code": 0, "data": series})
