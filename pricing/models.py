from __future__ import annotations

from django.db import models
from django.utils import timezone

from inventory.models import Product


class PricingLog(models.Model):
    product = models.ForeignKey(Product, related_name="pricing_logs", on_delete=models.CASCADE)
    old_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_price = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
