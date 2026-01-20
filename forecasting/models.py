from __future__ import annotations

from decimal import Decimal
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    """Customer model for demand tracking and analysis."""
    
    TYPE_RETAIL = 'retail'
    TYPE_WHOLESALE = 'wholesale'
    TYPE_DISTRIBUTOR = 'distributor'
    TYPE_ENTERPRISE = 'enterprise'
    TYPE_OTHER = 'other'
    
    TYPE_CHOICES = [
        (TYPE_RETAIL, '零售客户'),
        (TYPE_WHOLESALE, '批发客户'),
        (TYPE_DISTRIBUTOR, '经销商'),
        (TYPE_ENTERPRISE, '企业客户'),
        (TYPE_OTHER, '其他'),
    ]
    
    customer_code = models.CharField('客户编码', max_length=32, unique=True)
    name = models.CharField('客户名称', max_length=128)
    customer_type = models.CharField('客户类型', max_length=20, choices=TYPE_CHOICES, default=TYPE_OTHER)
    contact_person = models.CharField('联系人', max_length=64, blank=True, null=True)
    contact_phone = models.CharField('联系电话', max_length=20, blank=True, null=True)
    contact_email = models.EmailField('联系邮箱', blank=True, null=True)
    address = models.TextField('地址', blank=True, null=True)
    region = models.CharField('区域', max_length=64, blank=True, null=True)
    
    # Business metrics
    credit_level = models.IntegerField('信用等级', default=3)  # 1-5
    payment_terms = models.IntegerField('账期(天)', default=30)
    
    # Timestamps
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    is_active = models.BooleanField('是否活跃', default=True)
    
    class Meta:
        verbose_name = '客户'
        verbose_name_plural = '客户'
        ordering = ['customer_code']
    
    def __str__(self) -> str:
        return f"{self.customer_code} - {self.name}"


class DemandHistory(models.Model):
    """Historical demand data for forecasting analysis."""
    
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='demand_history',
        verbose_name='产品'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='demand_history',
        verbose_name='客户',
        blank=True,
        null=True
    )
    
    # Time dimension
    date = models.DateField('日期')
    year = models.IntegerField('年份')
    month = models.IntegerField('月份')
    week = models.IntegerField('周数', blank=True, null=True)
    
    # Quantity data
    actual_qty = models.DecimalField('实际数量', max_digits=12, decimal_places=2)
    forecast_qty = models.DecimalField('预测数量', max_digits=12, decimal_places=2)
    
    # Price and value
    unit_price = models.DecimalField('单价', max_digits=12, decimal_places=2, default=0)
    
    # Category for analysis
    category = models.CharField('品类', max_length=64, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        verbose_name = '需求历史'
        verbose_name_plural = '需求历史'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['product', 'date']),
            models.Index(fields=['customer', 'date']),
            models.Index(fields=['year', 'month']),
        ]
    
    def __str__(self) -> str:
        return f"{self.product.sku} - {self.date} - Actual: {self.actual_qty}"
    
    @property
    def forecast_error(self) -> Decimal:
        """Calculate forecast error."""
        return self.forecast_qty - self.actual_qty
    
    @property
    def bias_rate(self) -> float:
        """Calculate bias rate."""
        if self.actual_qty != 0:
            return float((self.forecast_qty - self.actual_qty) / self.actual_qty)
        return 0.0
    
    @property
    def absolute_error_pct(self) -> float:
        """Calculate absolute percentage error."""
        if self.actual_qty != 0:
            return abs(float((self.forecast_qty - self.actual_qty) / self.actual_qty * 100))
        return 0.0
    
    @property
    def estimated_value(self) -> Decimal:
        """Calculate estimated value."""
        return self.actual_qty * self.unit_price


class ForecastConfig(models.Model):
    """Configuration for inventory policy calculations."""
    
    name = models.CharField('配置名称', max_length=64, unique=True)
    description = models.TextField('描述', blank=True, null=True)
    
    # Inventory policy parameters
    service_level = models.DecimalField('服务水平', max_digits=4, decimal_places=2, default=0.95)
    lead_time_days = models.IntegerField('提前期(天)', default=7)
    review_period_days = models.IntegerField('检查周期(天)', default=30)
    
    # Product scope (optional filtering)
    categories = models.JSONField('适用品类', default=list, blank=True)
    
    # Flags
    is_default = models.BooleanField('是否默认', default=False)
    is_active = models.BooleanField('是否启用', default=True)
    
    # Timestamps
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        verbose_name = '预测配置'
        verbose_name_plural = '预测配置'
    
    def __str__(self) -> str:
        return f"{self.name} (SL: {self.service_level}, LT: {self.lead_time_days}d)"
    
    def save(self, *args, **kwargs):
        # Ensure only one default config
        if self.is_default:
            ForecastConfig.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class DemandForecast(models.Model):
    """Store generated demand forecasts."""
    
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='forecasts',
        verbose_name='产品'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='forecasts',
        verbose_name='客户',
        blank=True,
        null=True
    )
    
    # Forecast period
    forecast_date = models.DateField('预测日期')
    target_month = models.IntegerField('目标月份')
    target_year = models.IntegerField('目标年份')
    
    # User input
    user_forecast = models.DecimalField('用户预测', max_digits=12, decimal_places=2)
    
    # Calculated values
    predicted_actual = models.DecimalField('预测实际', max_digits=12, decimal_places=2)
    confidence_lower = models.DecimalField('置信下限', max_digits=12, decimal_places=2)
    confidence_upper = models.DecimalField('置信上限', max_digits=12, decimal_places=2)
    
    # Metrics
    bias_rate = models.DecimalField('偏差率', max_digits=6, decimal_places=4, default=0)
    mape = models.DecimalField('MAPE', max_digits=8, decimal_places=4, default=0)
    mae = models.DecimalField('MAE', max_digits=12, decimal_places=2, default=0)
    historical_records = models.IntegerField('历史记录数', default=0)
    seasonal_factor = models.DecimalField('季节因子', max_digits=6, decimal_places=4, blank=True, null=True)
    
    # Reliability
    RELIABILITY_HIGH = 'high'
    RELIABILITY_MEDIUM = 'medium'
    RELIABILITY_LOW = 'low'
    RELIABILITY_CHOICES = [
        (RELIABILITY_HIGH, '高'),
        (RELIABILITY_MEDIUM, '中'),
        (RELIABILITY_LOW, '低'),
    ]
    reliability = models.CharField('可靠性', max_length=10, choices=RELIABILITY_CHOICES, default=RELIABILITY_MEDIUM)
    warning = models.TextField('警告信息', blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='forecasts',
        verbose_name='创建人'
    )
    
    class Meta:
        verbose_name = '需求预测'
        verbose_name_plural = '需求预测'
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"{self.product.sku} - {self.target_year}/{self.target_month} - {self.predicted_actual}"


class InventoryPolicy(models.Model):
    """Calculated inventory policy parameters."""
    
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.CASCADE,
        related_name='policies',
        verbose_name='产品'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='policies',
        verbose_name='客户',
        blank=True,
        null=True
    )
    config = models.ForeignKey(
        ForecastConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='policies',
        verbose_name='配置'
    )
    
    # Calculated policy parameters
    safety_stock = models.DecimalField('安全库存', max_digits=12, decimal_places=2)
    reorder_point = models.DecimalField('再订货点', max_digits=12, decimal_places=2)
    target_stock_level = models.DecimalField('目标库存', max_digits=12, decimal_places=2)
    lead_time_demand = models.DecimalField('提前期需求', max_digits=12, decimal_places=2)
    z_score = models.DecimalField('Z值', max_digits=6, decimal_places=4)
    
    # Input parameters used
    daily_demand = models.DecimalField('日均需求', max_digits=12, decimal_places=2)
    daily_std_dev = models.DecimalField('日需求标准差', max_digits=12, decimal_places=2)
    service_level = models.DecimalField('服务水平', max_digits=4, decimal_places=2)
    lead_time_days = models.IntegerField('提前期(天)')
    
    # Timestamps
    calculated_at = models.DateTimeField('计算时间', auto_now_add=True)
    calculated_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calculated_policies',
        verbose_name='计算人'
    )
    
    class Meta:
        verbose_name = '库存策略'
        verbose_name_plural = '库存策略'
        ordering = ['-calculated_at']
    
    def __str__(self) -> str:
        return f"{self.product.sku} - SS: {self.safety_stock}, ROP: {self.reorder_point}"
