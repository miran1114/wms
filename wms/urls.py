from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    # Root
    path("", RootView.as_view(), name="root"),
    
    # Admin
    path("admin/", admin.site.urls),
    
    # Authentication
    path("api/auth/", include("authentication.urls")),
    
    # Forecasting
    path("api/forecast/", include("forecasting.urls")),
    
    # AI endpoints
    path("api/ai/analyze-inventory/", AnalyzeInventoryView.as_view(), name="analyze_inventory"),
    path("api/ai/update-pricing/", UpdatePricingView.as_view(), name="update_pricing"),
    
    # Dashboard
    path("api/dashboard/", DashboardView.as_view(), name="dashboard"),
    
    # Inventory endpoints
    path("api/inventory", InventoryListView.as_view(), name="inventory_list"),
    path("api/inventory/<int:pk>/stock", InventoryStockUpdateView.as_view(), name="inventory_stock"),
    path("api/inventory/<int:pk>/price", InventoryPriceUpdateView.as_view(), name="inventory_price"),
    path("api/inventory/<int:pk>", InventoryDeleteView.as_view(), name="inventory_delete"),
    
    # Logs and history
    path("api/logs", OperationLogsView.as_view(), name="operation_logs"),
    path("api/inventory/<int:pk>/price-history", PriceHistoryView.as_view(), name="price_history"),
    path("api/inventory/<int:pk>/stock-history", StockHistoryView.as_view(), name="stock_history"),
    
    # Health check
    path("api/health/", lambda request: __import__('django.http', fromlist=['JsonResponse']).JsonResponse({'status': 'ok', 'version': '2.0.0'}), name="health_check"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
