from django.urls import path

from .views import (
    # Customer views
    CustomerListView,
    CustomerDetailView,
    CustomerAnalysisView,
    
    # Demand history views
    DemandHistoryListView,
    DemandHistoryBulkImportView,
    
    # Forecast config views
    ForecastConfigListView,
    ForecastConfigDetailView,
    
    # Prediction views
    DemandPredictionView,
    BatchDemandPredictionView,
    
    # Inventory policy views
    InventoryPolicyCalculateView,
    ServiceLevelSimulationView,
    
    # Analytics views
    DemandBiasAnalysisView,
    DemandTrendView,
    ForecastDashboardView,
)

app_name = 'forecasting'

urlpatterns = [
    # Dashboard
    path('dashboard/', ForecastDashboardView.as_view(), name='dashboard'),
    
    # Customers
    path('customers/', CustomerListView.as_view(), name='customer_list'),
    path('customers/<int:pk>/', CustomerDetailView.as_view(), name='customer_detail'),
    path('customers/<int:pk>/analysis/', CustomerAnalysisView.as_view(), name='customer_analysis'),
    
    # Demand history
    path('demand-history/', DemandHistoryListView.as_view(), name='demand_history_list'),
    path('demand-history/import/', DemandHistoryBulkImportView.as_view(), name='demand_history_import'),
    
    # Forecast config
    path('configs/', ForecastConfigListView.as_view(), name='config_list'),
    path('configs/<int:pk>/', ForecastConfigDetailView.as_view(), name='config_detail'),
    
    # Predictions
    path('predict/', DemandPredictionView.as_view(), name='predict'),
    path('predict/batch/', BatchDemandPredictionView.as_view(), name='predict_batch'),
    
    # Inventory policy
    path('policy/calculate/', InventoryPolicyCalculateView.as_view(), name='policy_calculate'),
    path('policy/simulate/', ServiceLevelSimulationView.as_view(), name='policy_simulate'),
    
    # Analytics
    path('analytics/bias/', DemandBiasAnalysisView.as_view(), name='bias_analysis'),
    path('analytics/trend/', DemandTrendView.as_view(), name='demand_trend'),
]
