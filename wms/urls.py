from django.contrib import admin
from django.urls import path

from core.views import (
    AnalyzeInventoryView,
    UpdatePricingView,
    DashboardView,
    RootView,
    InventoryListView,
    InventoryStockUpdateView,
    InventoryPriceUpdateView,
    InventoryDeleteView,
    OperationLogsView,
    PriceHistoryView,
    StockHistoryView,
)


urlpatterns = [
    path("", RootView.as_view(), name="root"),
    path("admin/", admin.site.urls),
    path("api/ai/analyze-inventory/", AnalyzeInventoryView.as_view(), name="analyze_inventory"),
    path("api/ai/update-pricing/", UpdatePricingView.as_view(), name="update_pricing"),
    path("api/dashboard/", DashboardView.as_view(), name="dashboard"),
    path("api/inventory", InventoryListView.as_view(), name="inventory_list"),
    path("api/inventory/<int:pk>/stock", InventoryStockUpdateView.as_view(), name="inventory_stock"),
    path("api/inventory/<int:pk>/price", InventoryPriceUpdateView.as_view(), name="inventory_price"),
    path("api/inventory/<int:pk>", InventoryDeleteView.as_view(), name="inventory_delete"),
    path("api/logs", OperationLogsView.as_view(), name="operation_logs"),
    path("api/inventory/<int:pk>/price-history", PriceHistoryView.as_view(), name="price_history"),
    path("api/inventory/<int:pk>/stock-history", StockHistoryView.as_view(), name="stock_history"),
]
