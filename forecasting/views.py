from __future__ import annotations

import csv
import io
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List

from django.db import transaction
from django.db.models import Q, Avg, StdDev, Sum, Count
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import CanViewAnalytics, CanEditInventory
from core.models import OperationLog
from inventory.models import Product
from .models import Customer, DemandHistory, ForecastConfig, DemandForecast, InventoryPolicy
from .serializers import (
    CustomerSerializer, CustomerCreateSerializer,
    DemandHistorySerializer, DemandHistoryCreateSerializer, DemandHistoryBulkSerializer,
    ForecastConfigSerializer,
    DemandForecastSerializer, DemandPredictionRequestSerializer,
    InventoryPolicySerializer, PolicyCalculationRequestSerializer,
    ServiceLevelSimulationRequestSerializer,
    BiasAnalysisSerializer, DemandTrendSerializer,
)
from .utils import (
    predict_actual_demand, calculate_inventory_policy, calculate_monthly_strategy,
    calculate_bias_stats, calculate_seasonal_factor, aggregate_demand_by_period,
    simulate_service_level_cost
)


# ==================== Customer Views ====================

class CustomerListView(generics.ListCreateAPIView):
    """List and create customers."""
    
    queryset = Customer.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerCreateSerializer
        return CustomerSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(customer_code__icontains=search) |
                Q(name__icontains=search) |
                Q(contact_person__icontains=search)
            )
        
        # Type filter
        customer_type = self.request.query_params.get('type')
        if customer_type:
            queryset = queryset.filter(customer_type=customer_type)
        
        # Active filter
        is_active = self.request.query_params.get('active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def list(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('pageSize', 20))
        total = queryset.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        queryset = queryset[start:end]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        })
    
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else 'system',
            username=request.user.username if request.user.is_authenticated else '系统',
            operation_type='CUSTOMER_CREATE',
            operation_detail=f'创建客户: {customer.customer_code} - {customer.name}',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '客户创建成功',
            'data': CustomerSerializer(customer).data
        }, status=status.HTTP_201_CREATED)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, delete customer."""
    
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'code': 0,
            'data': serializer.data
        })
    
    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else 'system',
            username=request.user.username if request.user.is_authenticated else '系统',
            operation_type='CUSTOMER_UPDATE',
            operation_detail=f'更新客户: {instance.customer_code}',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '客户更新成功',
            'data': serializer.data
        })
    
    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        customer_code = instance.customer_code
        self.perform_destroy(instance)
        
        OperationLog.objects.create(
            user_id=str(request.user.id) if request.user.is_authenticated else 'system',
            username=request.user.username if request.user.is_authenticated else '系统',
            operation_type='CUSTOMER_DELETE',
            operation_detail=f'删除客户: {customer_code}',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '客户删除成功'
        })


# ==================== Demand History Views ====================

class DemandHistoryListView(generics.ListCreateAPIView):
    """List and create demand history records."""
    
    queryset = DemandHistory.objects.select_related('product', 'customer').all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DemandHistoryCreateSerializer
        return DemandHistorySerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Product filter
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        # Customer filter
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Date range filter
        start_date = self.request.query_params.get('startDate')
        end_date = self.request.query_params.get('endDate')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Year filter
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=int(year))
        
        # Month filter
        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(month=int(month))
        
        # Category filter
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset
    
    def list(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('pageSize', 50))
        total = queryset.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        queryset = queryset[start:end]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'pageSize': page_size
            }
        })
    
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demand = serializer.save()
        
        return Response({
            'code': 0,
            'message': '需求记录创建成功',
            'data': DemandHistorySerializer(demand).data
        }, status=status.HTTP_201_CREATED)


class DemandHistoryBulkImportView(APIView):
    """Bulk import demand history from CSV."""
    
    permission_classes = [permissions.IsAuthenticated, CanEditInventory]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request: Request) -> Response:
        file = request.FILES.get('file')
        if not file:
            return Response({
                'code': 1,
                'message': '请上传CSV文件'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read CSV file
            decoded_file = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded_file))
            
            records_created = 0
            errors = []
            
            with transaction.atomic():
                for i, row in enumerate(reader, start=1):
                    try:
                        # Map CSV columns to model fields
                        # Expected columns: Date, SKU_ID, Customer_ID, Actual_Qty, Forecast_Qty, Price, Category
                        
                        # Get or create product
                        sku = row.get('SKU_ID', row.get('sku', row.get('SKU', '')))
                        product = None
                        if sku:
                            product = Product.objects.filter(sku=sku).first()
                            if not product:
                                # Create product if not exists
                                product = Product.objects.create(
                                    sku=sku,
                                    name=row.get('Product_Name', sku),
                                    category=row.get('Category', '其他'),
                                    cost_price=0,
                                    current_selling_price=float(row.get('Price', 0))
                                )
                        
                        if not product:
                            errors.append(f'Row {i}: Missing or invalid SKU')
                            continue
                        
                        # Get or create customer
                        customer = None
                        customer_id = row.get('Customer_ID', row.get('customer_id', ''))
                        if customer_id:
                            customer = Customer.objects.filter(customer_code=customer_id).first()
                            if not customer:
                                customer_type = row.get('Customer_Type', 'other')
                                customer = Customer.objects.create(
                                    customer_code=customer_id,
                                    name=customer_id,
                                    customer_type=customer_type if customer_type in dict(Customer.TYPE_CHOICES) else 'other'
                                )
                        
                        # Parse date
                        date_str = row.get('Date', row.get('date', ''))
                        if date_str:
                            record_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                        else:
                            errors.append(f'Row {i}: Missing date')
                            continue
                        
                        # Create demand history record
                        DemandHistory.objects.create(
                            product=product,
                            customer=customer,
                            date=record_date,
                            year=record_date.year,
                            month=record_date.month,
                            week=record_date.isocalendar()[1],
                            actual_qty=Decimal(row.get('Actual_Qty', row.get('actual_qty', 0))),
                            forecast_qty=Decimal(row.get('Forecast_Qty', row.get('forecast_qty', 0))),
                            unit_price=Decimal(row.get('Price', row.get('price', 0))),
                            category=row.get('Category', row.get('category', ''))
                        )
                        records_created += 1
                        
                    except Exception as e:
                        errors.append(f'Row {i}: {str(e)}')
            
            OperationLog.objects.create(
                user_id=str(request.user.id),
                username=request.user.username,
                operation_type='DEMAND_BULK_IMPORT',
                operation_detail=f'批量导入需求数据: {records_created}条成功, {len(errors)}条失败',
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            
            return Response({
                'code': 0,
                'message': f'导入完成: {records_created}条成功',
                'data': {
                    'created': records_created,
                    'errors': errors[:20]  # Return first 20 errors
                }
            })
            
        except Exception as e:
            return Response({
                'code': 1,
                'message': f'导入失败: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


# ==================== Forecast Config Views ====================

class ForecastConfigListView(generics.ListCreateAPIView):
    """List and create forecast configurations."""
    
    queryset = ForecastConfig.objects.all()
    serializer_class = ForecastConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'data': {
                'list': serializer.data,
                'total': queryset.count()
            }
        })
    
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        
        return Response({
            'code': 0,
            'message': '配置创建成功',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class ForecastConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, delete forecast configuration."""
    
    queryset = ForecastConfig.objects.all()
    serializer_class = ForecastConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'code': 0,
            'data': serializer.data
        })
    
    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'code': 0,
            'message': '配置更新成功',
            'data': serializer.data
        })
    
    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        self.perform_destroy(instance)
        
        return Response({
            'code': 0,
            'message': '配置删除成功'
        })


# ==================== Demand Prediction Views ====================

class DemandPredictionView(APIView):
    """Predict actual demand based on user forecast and historical data."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def post(self, request: Request) -> Response:
        serializer = DemandPredictionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        product_id = data['product_id']
        customer_id = data.get('customer_id')
        target_month = data['target_month']
        target_year = data['target_year']
        user_forecast = float(data['user_forecast'])
        use_seasonal = data.get('use_seasonal', True)
        
        # Get historical demand data
        demand_qs = DemandHistory.objects.filter(product_id=product_id)
        if customer_id:
            demand_qs = demand_qs.filter(customer_id=customer_id)
        
        # Perform prediction
        result = predict_actual_demand(
            demand_history_qs=demand_qs,
            target_month=target_month,
            user_forecast=user_forecast,
            use_seasonal=use_seasonal
        )
        
        # Save forecast record
        product = Product.objects.get(id=product_id)
        customer = Customer.objects.get(id=customer_id) if customer_id else None
        
        forecast = DemandForecast.objects.create(
            product=product,
            customer=customer,
            forecast_date=timezone.now().date(),
            target_month=target_month,
            target_year=target_year,
            user_forecast=Decimal(str(user_forecast)),
            predicted_actual=Decimal(str(result['predicted_actual'])),
            confidence_lower=Decimal(str(result['confidence_interval'][0])),
            confidence_upper=Decimal(str(result['confidence_interval'][1])),
            bias_rate=Decimal(str(result['bias_rate'])),
            mape=Decimal(str(result['mape'])),
            mae=Decimal(str(result['mae'])),
            historical_records=result['historical_records'],
            seasonal_factor=Decimal(str(result['seasonal_factor'])) if result['seasonal_factor'] else None,
            reliability=result['reliability'],
            warning=result['warning'],
            created_by=request.user
        )
        
        return Response({
            'code': 0,
            'data': {
                'forecast_id': forecast.id,
                **result
            }
        })


class BatchDemandPredictionView(APIView):
    """Batch predict demand for multiple products/customers."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def post(self, request: Request) -> Response:
        predictions = request.data.get('predictions', [])
        if not predictions:
            return Response({
                'code': 1,
                'message': '请提供预测数据'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        
        for pred in predictions:
            product_id = pred.get('product_id')
            customer_id = pred.get('customer_id')
            target_month = pred.get('target_month')
            user_forecast = float(pred.get('user_forecast', 0))
            
            if not product_id or not target_month:
                continue
            
            # Get historical demand data
            demand_qs = DemandHistory.objects.filter(product_id=product_id)
            if customer_id:
                demand_qs = demand_qs.filter(customer_id=customer_id)
            
            # Perform prediction
            result = predict_actual_demand(
                demand_history_qs=demand_qs,
                target_month=target_month,
                user_forecast=user_forecast,
                use_seasonal=True
            )
            
            results.append({
                'product_id': product_id,
                'customer_id': customer_id,
                'target_month': target_month,
                'user_forecast': user_forecast,
                **result
            })
        
        return Response({
            'code': 0,
            'data': {
                'predictions': results,
                'count': len(results)
            }
        })


# ==================== Inventory Policy Views ====================

class InventoryPolicyCalculateView(APIView):
    """Calculate inventory policy parameters."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def post(self, request: Request) -> Response:
        serializer = PolicyCalculationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        product_id = data['product_id']
        customer_id = data.get('customer_id')
        service_level = float(data['service_level'])
        lead_time_days = data['lead_time_days']
        review_period_days = data['review_period_days']
        
        # Get historical demand data
        demand_qs = DemandHistory.objects.filter(product_id=product_id)
        if customer_id:
            demand_qs = demand_qs.filter(customer_id=customer_id)
        
        if not demand_qs.exists():
            return Response({
                'code': 1,
                'message': '没有足够的历史数据计算库存策略'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate daily statistics
        # Aggregate by date to get daily demand
        daily_demand_data = demand_qs.values('date').annotate(
            daily_qty=Sum('actual_qty')
        )
        
        if not daily_demand_data:
            return Response({
                'code': 1,
                'message': '没有足够的历史数据计算库存策略'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        daily_qtys = [float(d['daily_qty']) for d in daily_demand_data]
        daily_demand = sum(daily_qtys) / len(daily_qtys)
        
        # Calculate standard deviation
        if len(daily_qtys) > 1:
            mean = daily_demand
            variance = sum((x - mean) ** 2 for x in daily_qtys) / (len(daily_qtys) - 1)
            daily_std_dev = variance ** 0.5
        else:
            daily_std_dev = daily_demand * 0.3  # Default 30% CV
        
        # Calculate policy
        policy = calculate_inventory_policy(
            daily_demand=daily_demand,
            daily_std_dev=daily_std_dev,
            lead_time_days=lead_time_days,
            service_level=service_level,
            review_period_days=review_period_days
        )
        
        # Save policy record
        product = Product.objects.get(id=product_id)
        customer = Customer.objects.get(id=customer_id) if customer_id else None
        
        policy_record = InventoryPolicy.objects.create(
            product=product,
            customer=customer,
            safety_stock=Decimal(str(policy['safety_stock'])),
            reorder_point=Decimal(str(policy['reorder_point'])),
            target_stock_level=Decimal(str(policy['target_stock_level'])),
            lead_time_demand=Decimal(str(policy['lead_time_demand'])),
            z_score=Decimal(str(policy['z_score'])),
            daily_demand=Decimal(str(round(daily_demand, 2))),
            daily_std_dev=Decimal(str(round(daily_std_dev, 2))),
            service_level=Decimal(str(service_level)),
            lead_time_days=lead_time_days,
            calculated_by=request.user
        )
        
        return Response({
            'code': 0,
            'data': {
                'policy_id': policy_record.id,
                'daily_demand': round(daily_demand, 2),
                'daily_std_dev': round(daily_std_dev, 2),
                **policy
            }
        })


class ServiceLevelSimulationView(APIView):
    """Simulate service level vs cost trade-off."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def post(self, request: Request) -> Response:
        serializer = ServiceLevelSimulationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        product_id = data['product_id']
        customer_id = data.get('customer_id')
        lead_time_days = data['lead_time_days']
        holding_cost = float(data['holding_cost_per_unit'])
        service_levels = data.get('service_levels')
        
        if service_levels:
            service_levels = [float(sl) for sl in service_levels]
        
        # Get historical demand data
        demand_qs = DemandHistory.objects.filter(product_id=product_id)
        if customer_id:
            demand_qs = demand_qs.filter(customer_id=customer_id)
        
        if not demand_qs.exists():
            return Response({
                'code': 1,
                'message': '没有足够的历史数据进行仿真'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate daily statistics
        daily_demand_data = demand_qs.values('date').annotate(
            daily_qty=Sum('actual_qty')
        )
        
        daily_qtys = [float(d['daily_qty']) for d in daily_demand_data]
        daily_demand = sum(daily_qtys) / len(daily_qtys)
        
        if len(daily_qtys) > 1:
            mean = daily_demand
            variance = sum((x - mean) ** 2 for x in daily_qtys) / (len(daily_qtys) - 1)
            daily_std_dev = variance ** 0.5
        else:
            daily_std_dev = daily_demand * 0.3
        
        # Run simulation
        simulation_results = simulate_service_level_cost(
            daily_demand=daily_demand,
            daily_std_dev=daily_std_dev,
            lead_time_days=lead_time_days,
            holding_cost_per_unit=holding_cost,
            service_levels=service_levels
        )
        
        return Response({
            'code': 0,
            'data': {
                'daily_demand': round(daily_demand, 2),
                'daily_std_dev': round(daily_std_dev, 2),
                'lead_time_days': lead_time_days,
                'simulation': simulation_results
            }
        })


# ==================== Analytics Views ====================

class DemandBiasAnalysisView(APIView):
    """Analyze forecast bias for a product/customer."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def get(self, request: Request) -> Response:
        product_id = request.query_params.get('product')
        customer_id = request.query_params.get('customer')
        
        demand_qs = DemandHistory.objects.all()
        
        if product_id:
            demand_qs = demand_qs.filter(product_id=product_id)
        if customer_id:
            demand_qs = demand_qs.filter(customer_id=customer_id)
        
        # Calculate overall bias stats
        stats = calculate_bias_stats(demand_qs)
        
        # Calculate monthly seasonal factors
        monthly_factors = {}
        for month in range(1, 13):
            factor = calculate_seasonal_factor(demand_qs, month)
            if factor is not None:
                monthly_factors[month] = factor
        
        return Response({
            'code': 0,
            'data': {
                'overall': stats,
                'seasonal_factors': monthly_factors
            }
        })


class DemandTrendView(APIView):
    """Get demand trend data aggregated by period."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def get(self, request: Request) -> Response:
        product_id = request.query_params.get('product')
        customer_id = request.query_params.get('customer')
        group_by = request.query_params.get('groupBy', 'month')  # month, year, week
        
        demand_qs = DemandHistory.objects.all()
        
        if product_id:
            demand_qs = demand_qs.filter(product_id=product_id)
        if customer_id:
            demand_qs = demand_qs.filter(customer_id=customer_id)
        
        # Year filter
        year = request.query_params.get('year')
        if year:
            demand_qs = demand_qs.filter(year=int(year))
        
        # Category filter
        category = request.query_params.get('category')
        if category:
            demand_qs = demand_qs.filter(category=category)
        
        # Aggregate data
        trend_data = aggregate_demand_by_period(demand_qs, group_by)
        
        return Response({
            'code': 0,
            'data': {
                'trend': trend_data,
                'group_by': group_by
            }
        })


class CustomerAnalysisView(APIView):
    """Detailed customer analysis with demand patterns."""
    
    permission_classes = [permissions.IsAuthenticated, CanViewAnalytics]
    
    def get(self, request: Request, pk: int) -> Response:
        try:
            customer = Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return Response({
                'code': 1,
                'message': '客户不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get customer demand history
        demand_qs = DemandHistory.objects.filter(customer=customer)
        
        # Basic stats
        stats = calculate_bias_stats(demand_qs)
        
        # Monthly trend
        monthly_trend = aggregate_demand_by_period(demand_qs, 'month')
        
        # Category breakdown
        category_breakdown = demand_qs.values('category').annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            count=Count('id')
        ).order_by('-total_actual')
        
        # Product breakdown
        product_breakdown = demand_qs.values(
            'product__sku', 'product__name'
        ).annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            count=Count('id')
        ).order_by('-total_actual')[:10]
        
        return Response({
            'code': 0,
            'data': {
                'customer': CustomerSerializer(customer).data,
                'bias_stats': stats,
                'monthly_trend': monthly_trend,
                'category_breakdown': list(category_breakdown),
                'top_products': list(product_breakdown)
            }
        })


class ForecastDashboardView(APIView):
    """Dashboard overview for forecasting module."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request: Request) -> Response:
        # Get counts
        customer_count = Customer.objects.filter(is_active=True).count()
        demand_record_count = DemandHistory.objects.count()
        forecast_count = DemandForecast.objects.count()
        policy_count = InventoryPolicy.objects.count()
        
        # Recent forecasts
        recent_forecasts = DemandForecast.objects.select_related(
            'product', 'customer', 'created_by'
        ).order_by('-created_at')[:10]
        
        # Get overall stats
        demand_qs = DemandHistory.objects.all()
        overall_stats = calculate_bias_stats(demand_qs)
        
        # Get data summary by year
        yearly_summary = DemandHistory.objects.values('year').annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            record_count=Count('id')
        ).order_by('year')
        
        return Response({
            'code': 0,
            'data': {
                'counts': {
                    'customers': customer_count,
                    'demand_records': demand_record_count,
                    'forecasts': forecast_count,
                    'policies': policy_count
                },
                'overall_stats': overall_stats,
                'yearly_summary': list(yearly_summary),
                'recent_forecasts': DemandForecastSerializer(recent_forecasts, many=True).data
            }
        })
