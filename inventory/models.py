from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db import models
from django.utils import timezone


class Product(models.Model):
    sku = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=128)
    category = models.CharField(max_length=64)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    current_selling_price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.sku}-{self.name}"


class InventoryQuerySet(models.QuerySet):
    def aggregate_total_quantity(self) -> int:
        return int(self.aggregate(models.Sum("quantity")).get("quantity__sum") or 0)


class Inventory(models.Model):
    product = models.ForeignKey(Product, related_name="inventories", on_delete=models.CASCADE)
    quantity = models.IntegerField()
    location = models.CharField(max_length=64)
    min_safety_stock = models.IntegerField(default=0)
    max_capacity = models.IntegerField(default=0)

    objects = InventoryQuerySet.as_manager()

    def __str__(self) -> str:
        return f"{self.product.sku}@{self.location}:{self.quantity}"


class Transaction(models.Model):
    KIND_IN = "in"
    KIND_OUT = "out"
    KIND_CHOICES = ((KIND_IN, KIND_IN), (KIND_OUT, KIND_OUT))

    product = models.ForeignKey(Product, related_name="transactions", on_delete=models.CASCADE)
    quantity = models.IntegerField()
    kind = models.CharField(max_length=8, choices=KIND_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"{self.kind}:{self.product.sku}:{self.quantity}"
