from django.contrib import admin

from .models import Customer, DemandHistory, ForecastConfig, DemandForecast, InventoryPolicy


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['customer_code', 'name', 'customer_type', 'region', 'is_active', 'created_at']
    list_filter = ['customer_type', 'is_active', 'region', 'created_at']
    search_fields = ['customer_code', 'name', 'contact_person', 'contact_email']
    ordering = ['customer_code']


@admin.register(DemandHistory)
class DemandHistoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'customer', 'date', 'actual_qty', 'forecast_qty', 'category']
    list_filter = ['year', 'month', 'category', 'created_at']
    search_fields = ['product__sku', 'product__name', 'customer__customer_code']
    ordering = ['-date']
    date_hierarchy = 'date'


@admin.register(ForecastConfig)
class ForecastConfigAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_level', 'lead_time_days', 'is_default', 'is_active']
    list_filter = ['is_default', 'is_active']
    search_fields = ['name', 'description']


@admin.register(DemandForecast)
class DemandForecastAdmin(admin.ModelAdmin):
    list_display = ['product', 'customer', 'target_year', 'target_month', 'user_forecast', 'predicted_actual', 'reliability']
    list_filter = ['reliability', 'target_year', 'target_month', 'created_at']
    search_fields = ['product__sku', 'product__name', 'customer__customer_code']
    ordering = ['-created_at']


@admin.register(InventoryPolicy)
class InventoryPolicyAdmin(admin.ModelAdmin):
    list_display = ['product', 'customer', 'safety_stock', 'reorder_point', 'service_level', 'calculated_at']
    list_filter = ['service_level', 'calculated_at']
    search_fields = ['product__sku', 'product__name']
    ordering = ['-calculated_at']
