from __future__ import annotations

from django.db import models

from inventory.models import Product


class MarketData(models.Model):
    product = models.ForeignKey(Product, related_name="market_data", on_delete=models.CASCADE)
    market_price = models.DecimalField(max_digits=12, decimal_places=2)
    demand_index = models.IntegerField()
    competitor_price = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-recorded_at"]

