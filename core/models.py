from __future__ import annotations

from django.db import models


class OperationLog(models.Model):
    user_id = models.CharField(max_length=64, default="system")
    username = models.CharField(max_length=64, default="系统")
    operation_type = models.CharField(max_length=32)
    operation_detail = models.TextField()
    ip_address = models.CharField(max_length=64, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

