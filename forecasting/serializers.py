from __future__ import annotations

from rest_framework import serializers
from decimal import Decimal

from inventory.models import Product
from .models import Customer, DemandHistory, ForecastConfig, DemandForecast, InventoryPolicy


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer model."""
    
    type_display = serializers.CharField(source='get_customer_type_display', read_only=True)
    demand_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'name', 'customer_type', 'type_display',
            'contact_person', 'contact_phone', 'contact_email', 'address', 'region',
            'credit_level', 'payment_terms', 'is_active', 'created_at', 'updated_at',
            'demand_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_demand_count(self, obj) -> int:
        return obj.demand_history.count()


class CustomerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating customers."""
    
    class Meta:
        model = Customer
        fields = [
            'customer_code', 'name', 'customer_type',
            'contact_person', 'contact_phone', 'contact_email', 'address', 'region',
            'credit_level', 'payment_terms'
        ]


class DemandHistorySerializer(serializers.ModelSerializer):
    """Serializer for DemandHistory model."""
    
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    forecast_error = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    bias_rate = serializers.FloatField(read_only=True)
    absolute_error_pct = serializers.FloatField(read_only=True)
    estimated_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    
    class Meta:
        model = DemandHistory
        fields = [
            'id', 'product', 'product_sku', 'product_name',
            'customer', 'customer_name',
            'date', 'year', 'month', 'week',
            'actual_qty', 'forecast_qty', 'unit_price', 'category',
            'forecast_error', 'bias_rate', 'absolute_error_pct', 'estimated_value',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'forecast_error', 'bias_rate', 'absolute_error_pct', 
                           'estimated_value', 'created_at', 'updated_at']


class DemandHistoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating demand history records."""
    
    class Meta:
        model = DemandHistory
        fields = [
            'product', 'customer', 'date', 'year', 'month', 'week',
            'actual_qty', 'forecast_qty', 'unit_price', 'category'
        ]
    
    def validate(self, attrs):
        # Auto-fill year and month from date if not provided
        if 'date' in attrs:
            if 'year' not in attrs or not attrs['year']:
                attrs['year'] = attrs['date'].year
            if 'month' not in attrs or not attrs['month']:
                attrs['month'] = attrs['date'].month
        return attrs


class DemandHistoryBulkSerializer(serializers.Serializer):
    """Serializer for bulk importing demand history from CSV."""
    
    records = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def validate_records(self, value):
        required_fields = ['date', 'actual_qty', 'forecast_qty']
        for i, record in enumerate(value):
            for field in required_fields:
                if field not in record:
                    raise serializers.ValidationError(
                        f'Record {i+1} missing required field: {field}'
                    )
        return value


class ForecastConfigSerializer(serializers.ModelSerializer):
    """Serializer for ForecastConfig model."""
    
    class Meta:
        model = ForecastConfig
        fields = [
            'id', 'name', 'description',
            'service_level', 'lead_time_days', 'review_period_days',
            'categories', 'is_default', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DemandForecastSerializer(serializers.ModelSerializer):
    """Serializer for DemandForecast model."""
    
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    reliability_display = serializers.CharField(source='get_reliability_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = DemandForecast
        fields = [
            'id', 'product', 'product_sku', 'product_name',
            'customer', 'customer_name',
            'forecast_date', 'target_month', 'target_year',
            'user_forecast', 'predicted_actual',
            'confidence_lower', 'confidence_upper',
            'bias_rate', 'mape', 'mae', 'historical_records', 'seasonal_factor',
            'reliability', 'reliability_display', 'warning',
            'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'predicted_actual', 'confidence_lower', 'confidence_upper',
            'bias_rate', 'mape', 'mae', 'historical_records', 'seasonal_factor',
            'reliability', 'warning', 'created_at', 'created_by'
        ]


class DemandPredictionRequestSerializer(serializers.Serializer):
    """Serializer for demand prediction requests."""
    
    product_id = serializers.IntegerField()
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    target_month = serializers.IntegerField(min_value=1, max_value=12)
    target_year = serializers.IntegerField(min_value=2020, max_value=2030)
    user_forecast = serializers.DecimalField(max_digits=12, decimal_places=2)
    use_seasonal = serializers.BooleanField(default=True)
    
    def validate_product_id(self, value):
        if not Product.objects.filter(id=value).exists():
            raise serializers.ValidationError('产品不存在')
        return value
    
    def validate_customer_id(self, value):
        if value and not Customer.objects.filter(id=value).exists():
            raise serializers.ValidationError('客户不存在')
        return value


class InventoryPolicySerializer(serializers.ModelSerializer):
    """Serializer for InventoryPolicy model."""
    
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    config_name = serializers.CharField(source='config.name', read_only=True, allow_null=True)
    calculated_by_name = serializers.CharField(source='calculated_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = InventoryPolicy
        fields = [
            'id', 'product', 'product_sku', 'product_name',
            'customer', 'customer_name', 'config', 'config_name',
            'safety_stock', 'reorder_point', 'target_stock_level', 'lead_time_demand', 'z_score',
            'daily_demand', 'daily_std_dev', 'service_level', 'lead_time_days',
            'calculated_at', 'calculated_by', 'calculated_by_name'
        ]
        read_only_fields = ['id', 'calculated_at', 'calculated_by']


class PolicyCalculationRequestSerializer(serializers.Serializer):
    """Serializer for inventory policy calculation requests."""
    
    product_id = serializers.IntegerField()
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    service_level = serializers.DecimalField(max_digits=4, decimal_places=2, default=Decimal('0.95'))
    lead_time_days = serializers.IntegerField(default=7)
    review_period_days = serializers.IntegerField(default=30)
    
    def validate_product_id(self, value):
        if not Product.objects.filter(id=value).exists():
            raise serializers.ValidationError('产品不存在')
        return value
    
    def validate_service_level(self, value):
        if value < 0.5 or value > 0.999:
            raise serializers.ValidationError('服务水平必须在0.5到0.999之间')
        return value


class ServiceLevelSimulationRequestSerializer(serializers.Serializer):
    """Serializer for service level simulation requests."""
    
    product_id = serializers.IntegerField()
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    lead_time_days = serializers.IntegerField(default=7)
    holding_cost_per_unit = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.0'))
    service_levels = serializers.ListField(
        child=serializers.DecimalField(max_digits=4, decimal_places=2),
        required=False
    )


class BiasAnalysisSerializer(serializers.Serializer):
    """Serializer for bias analysis results."""
    
    avg_bias_rate = serializers.FloatField()
    mape = serializers.FloatField()
    mae = serializers.FloatField()
    std_error = serializers.FloatField()
    record_count = serializers.IntegerField()


class DemandTrendSerializer(serializers.Serializer):
    """Serializer for demand trend data."""
    
    year = serializers.IntegerField()
    month = serializers.IntegerField(required=False)
    week = serializers.IntegerField(required=False)
    total_actual = serializers.FloatField()
    total_forecast = serializers.FloatField()
    forecast_error = serializers.FloatField()
    bias_rate = serializers.FloatField()
    count = serializers.IntegerField()
    avg_actual = serializers.FloatField()
    avg_forecast = serializers.FloatField()
