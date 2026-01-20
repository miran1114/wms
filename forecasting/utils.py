"""
Forecasting utility functions ported from the Streamlit system.
These implement statistical forecasting algorithms for demand prediction
and inventory policy calculation.
"""
from __future__ import annotations

import math
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date

from django.db.models import Avg, StdDev, Sum, Count, F
from django.db.models.functions import ExtractMonth, ExtractYear
from scipy.stats import norm


def calculate_z_score(service_level: float) -> float:
    """
    Calculate Z-score (normal distribution quantile) for given service level.
    
    Args:
        service_level: Target service level (0.0 - 1.0)
        
    Returns:
        Z-score value
    """
    return norm.ppf(service_level)


def calculate_inventory_policy(
    daily_demand: float,
    daily_std_dev: float,
    lead_time_days: int,
    service_level: float = 0.95,
    review_period_days: int = 30
) -> Dict[str, float]:
    """
    Calculate inventory policy parameters (SS, ROP, Max Stock).
    
    Formula:
    - Safety Stock (SS) = Z × σ × √(Lead Time)
    - Reorder Point (ROP) = Lead Time Demand + Safety Stock
    - Target Stock = Demand × (Lead Time + Review Period) + Safety Stock
    
    Args:
        daily_demand: Average daily demand
        daily_std_dev: Standard deviation of daily demand
        lead_time_days: Lead time in days
        service_level: Target service level (default 0.95)
        review_period_days: Review period in days (default 30)
        
    Returns:
        Dictionary with safety_stock, reorder_point, target_stock_level, 
        lead_time_demand, z_score
    """
    # Calculate Z-score from service level
    z_score = calculate_z_score(service_level)
    
    # Safety Stock = Z × σ × √(Lead Time)
    safety_stock = z_score * daily_std_dev * math.sqrt(lead_time_days)
    
    # Lead Time Demand
    lead_time_demand = daily_demand * lead_time_days
    
    # Reorder Point = Lead Time Demand + Safety Stock
    reorder_point = lead_time_demand + safety_stock
    
    # Target Stock Level = Demand × (Lead Time + Review Period) + Safety Stock
    target_stock_level = daily_demand * (lead_time_days + review_period_days) + safety_stock
    
    return {
        "safety_stock": max(0, round(safety_stock, 2)),
        "reorder_point": max(0, round(reorder_point, 2)),
        "target_stock_level": max(0, round(target_stock_level, 2)),
        "lead_time_demand": max(0, round(lead_time_demand, 2)),
        "z_score": round(z_score, 4)
    }


def calculate_monthly_strategy(
    monthly_demand: float,
    metrics_mae: float,
    lead_time_days: int,
    service_level: float,
    days_in_month: int = 30
) -> Dict[str, float]:
    """
    Calculate inventory policy based on monthly forecast.
    
    Args:
        monthly_demand: Expected monthly demand
        metrics_mae: Mean Absolute Error from historical data
        lead_time_days: Lead time in days
        service_level: Target service level
        days_in_month: Days in the month (default 30)
        
    Returns:
        Inventory policy parameters
    """
    daily_demand = monthly_demand / days_in_month
    
    # Estimate daily standard deviation (assuming MAE reflects monthly volatility)
    monthly_std_dev = metrics_mae * 1.25
    daily_std_dev = monthly_std_dev / math.sqrt(days_in_month)
    
    return calculate_inventory_policy(
        daily_demand=daily_demand,
        daily_std_dev=daily_std_dev,
        lead_time_days=lead_time_days,
        service_level=service_level,
        review_period_days=days_in_month
    )


def calculate_bias_stats(demand_history_qs) -> Dict[str, float]:
    """
    Calculate bias statistics from demand history queryset.
    
    Args:
        demand_history_qs: DemandHistory queryset
        
    Returns:
        Dictionary with avg_bias_rate, mape, mae, std_error, record_count
    """
    if not demand_history_qs.exists():
        return {
            'avg_bias_rate': 0.0,
            'mape': 0.0,
            'mae': 0.0,
            'std_error': 0.0,
            'record_count': 0
        }
    
    # Fetch data for calculation
    records = list(demand_history_qs.values('actual_qty', 'forecast_qty'))
    
    if not records:
        return {
            'avg_bias_rate': 0.0,
            'mape': 0.0,
            'mae': 0.0,
            'std_error': 0.0,
            'record_count': 0
        }
    
    bias_rates = []
    abs_errors = []
    abs_pct_errors = []
    
    for r in records:
        actual = float(r['actual_qty'])
        forecast = float(r['forecast_qty'])
        error = forecast - actual
        
        if actual != 0:
            bias_rate = error / actual
            abs_pct_error = abs(error / actual * 100)
        else:
            bias_rate = 0
            abs_pct_error = 0
        
        bias_rates.append(bias_rate)
        abs_errors.append(abs(error))
        abs_pct_errors.append(abs_pct_error)
    
    n = len(records)
    avg_bias_rate = sum(bias_rates) / n if n > 0 else 0
    mape = sum(abs_pct_errors) / n if n > 0 else 0
    mae = sum(abs_errors) / n if n > 0 else 0
    
    # Calculate standard deviation of bias rates
    if n > 1:
        variance = sum((b - avg_bias_rate) ** 2 for b in bias_rates) / (n - 1)
        std_error = math.sqrt(variance)
    else:
        std_error = 0
    
    return {
        'avg_bias_rate': round(avg_bias_rate, 4),
        'mape': round(mape, 2),
        'mae': round(mae, 2),
        'std_error': round(std_error, 4),
        'record_count': n
    }


def calculate_seasonal_factor(demand_history_qs, target_month: int) -> Optional[float]:
    """
    Calculate seasonal factor for a target month based on historical data.
    
    Args:
        demand_history_qs: DemandHistory queryset
        target_month: Target month (1-12)
        
    Returns:
        Seasonal factor or None if insufficient data
    """
    # Get all records
    all_records = list(demand_history_qs.values('actual_qty', 'forecast_qty', 'month'))
    
    if not all_records:
        return None
    
    # Filter for target month
    target_month_records = [r for r in all_records if r['month'] == target_month]
    
    if not target_month_records:
        return None
    
    # Calculate bias rate for target month
    target_bias_rates = []
    for r in target_month_records:
        actual = float(r['actual_qty'])
        forecast = float(r['forecast_qty'])
        if actual != 0:
            target_bias_rates.append((forecast - actual) / actual)
    
    if not target_bias_rates:
        return None
    
    target_avg_bias = sum(target_bias_rates) / len(target_bias_rates)
    
    # Calculate overall bias rate
    overall_bias_rates = []
    for r in all_records:
        actual = float(r['actual_qty'])
        forecast = float(r['forecast_qty'])
        if actual != 0:
            overall_bias_rates.append((forecast - actual) / actual)
    
    if not overall_bias_rates:
        return None
    
    overall_avg_bias = sum(overall_bias_rates) / len(overall_bias_rates)
    
    # Seasonal factor = target month bias / overall bias
    if overall_avg_bias != 0:
        return round(target_avg_bias / overall_avg_bias, 4)
    
    return None


def calculate_confidence_interval(
    predicted_value: float,
    std_error: float,
    confidence_level: float = 0.95
) -> Tuple[float, float]:
    """
    Calculate confidence interval for a predicted value.
    
    Args:
        predicted_value: The predicted value
        std_error: Standard error of prediction
        confidence_level: Confidence level (default 0.95)
        
    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    # Z-scores for common confidence levels
    z_scores = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.58
    }
    z_score = z_scores.get(confidence_level, 1.96)
    
    margin = predicted_value * std_error * z_score
    lower_bound = max(0, predicted_value - margin)
    upper_bound = predicted_value + margin
    
    return (round(lower_bound, 2), round(upper_bound, 2))


def predict_actual_demand(
    demand_history_qs,
    target_month: int,
    user_forecast: float,
    use_seasonal: bool = True
) -> Dict[str, Any]:
    """
    Predict actual demand based on historical bias patterns.
    
    Formula: Predicted Actual = User Forecast × (1 - Bias Rate)
    
    Args:
        demand_history_qs: DemandHistory queryset for the customer/product
        target_month: Target month (1-12)
        user_forecast: User's forecast input
        use_seasonal: Whether to apply seasonal adjustment
        
    Returns:
        Dictionary with prediction results and metrics
    """
    if not demand_history_qs.exists():
        return {
            'predicted_actual': user_forecast,
            'confidence_interval': (user_forecast * 0.8, user_forecast * 1.2),
            'bias_rate': 0.0,
            'mape': 0.0,
            'mae': 0.0,
            'historical_records': 0,
            'seasonal_factor': None,
            'warning': '没有历史数据，预测结果仅供参考',
            'reliability': 'low'
        }
    
    # Calculate bias statistics
    stats = calculate_bias_stats(demand_history_qs)
    
    # Determine bias rate to use
    bias_rate = stats['avg_bias_rate']
    seasonal_factor = None
    
    if use_seasonal:
        seasonal_factor = calculate_seasonal_factor(demand_history_qs, target_month)
        if seasonal_factor is not None:
            # Get target month specific bias rate
            target_month_records = demand_history_qs.filter(month=target_month)
            if target_month_records.exists():
                target_stats = calculate_bias_stats(target_month_records)
                bias_rate = target_stats['avg_bias_rate']
    
    # Predict actual demand
    # Formula: Predicted Actual = User Forecast × (1 - Bias Rate)
    predicted_actual = user_forecast * (1 - bias_rate)
    predicted_actual = max(0, predicted_actual)
    
    # Calculate confidence interval
    confidence_interval = calculate_confidence_interval(predicted_actual, stats['std_error'])
    
    # Determine reliability
    record_count = stats['record_count']
    if record_count >= 10:
        reliability = 'high'
    elif record_count >= 5:
        reliability = 'medium'
    else:
        reliability = 'low'
    
    return {
        'predicted_actual': round(predicted_actual, 2),
        'confidence_interval': confidence_interval,
        'bias_rate': bias_rate,
        'mape': stats['mape'],
        'mae': stats['mae'],
        'historical_records': record_count,
        'seasonal_factor': seasonal_factor,
        'warning': None,
        'reliability': reliability
    }


def simulate_service_level_cost(
    daily_demand: float,
    daily_std_dev: float,
    lead_time_days: int,
    holding_cost_per_unit: float = 1.0,
    service_levels: List[float] = None
) -> List[Dict[str, float]]:
    """
    Simulate the relationship between service level and inventory cost.
    
    Args:
        daily_demand: Average daily demand
        daily_std_dev: Standard deviation of daily demand
        lead_time_days: Lead time in days
        holding_cost_per_unit: Cost to hold one unit per day
        service_levels: List of service levels to simulate
        
    Returns:
        List of simulation results with service_level, safety_stock, 
        holding_cost, stockout_risk
    """
    if service_levels is None:
        service_levels = [0.80, 0.85, 0.90, 0.92, 0.95, 0.97, 0.99]
    
    results = []
    
    for sl in service_levels:
        policy = calculate_inventory_policy(
            daily_demand=daily_demand,
            daily_std_dev=daily_std_dev,
            lead_time_days=lead_time_days,
            service_level=sl
        )
        
        # Calculate approximate holding cost (simplified)
        avg_inventory = policy['safety_stock'] + (policy['lead_time_demand'] / 2)
        holding_cost = avg_inventory * holding_cost_per_unit * 30  # Monthly cost
        
        results.append({
            'service_level': sl,
            'service_level_pct': round(sl * 100, 1),
            'safety_stock': policy['safety_stock'],
            'reorder_point': policy['reorder_point'],
            'target_stock': policy['target_stock_level'],
            'stockout_risk': round((1 - sl) * 100, 2),
            'holding_cost': round(holding_cost, 2)
        })
    
    return results


def aggregate_demand_by_period(
    demand_history_qs,
    group_by: str = 'month'  # 'month', 'year', 'week'
) -> List[Dict[str, Any]]:
    """
    Aggregate demand data by time period.
    
    Args:
        demand_history_qs: DemandHistory queryset
        group_by: Aggregation period ('month', 'year', 'week')
        
    Returns:
        List of aggregated data points
    """
    if group_by == 'year':
        aggregation = demand_history_qs.values('year').annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            count=Count('id'),
            avg_actual=Avg('actual_qty'),
            avg_forecast=Avg('forecast_qty')
        ).order_by('year')
    elif group_by == 'week':
        aggregation = demand_history_qs.values('year', 'week').annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            count=Count('id'),
            avg_actual=Avg('actual_qty'),
            avg_forecast=Avg('forecast_qty')
        ).order_by('year', 'week')
    else:  # month
        aggregation = demand_history_qs.values('year', 'month').annotate(
            total_actual=Sum('actual_qty'),
            total_forecast=Sum('forecast_qty'),
            count=Count('id'),
            avg_actual=Avg('actual_qty'),
            avg_forecast=Avg('forecast_qty')
        ).order_by('year', 'month')
    
    results = []
    for item in aggregation:
        total_actual = float(item['total_actual'] or 0)
        total_forecast = float(item['total_forecast'] or 0)
        
        # Calculate error metrics
        error = total_forecast - total_actual
        bias_rate = error / total_actual if total_actual != 0 else 0
        
        result = {
            **item,
            'total_actual': round(total_actual, 2),
            'total_forecast': round(total_forecast, 2),
            'forecast_error': round(error, 2),
            'bias_rate': round(bias_rate, 4),
            'avg_actual': round(float(item['avg_actual'] or 0), 2),
            'avg_forecast': round(float(item['avg_forecast'] or 0), 2),
        }
        results.append(result)
    
    return results
