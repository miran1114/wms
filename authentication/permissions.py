from __future__ import annotations

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView


class IsAdminUser(permissions.BasePermission):
    """Permission class for admin users only."""
    
    message = '只有管理员才能执行此操作'
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_admin
        )


class IsManagerOrAdmin(permissions.BasePermission):
    """Permission class for managers and admins."""
    
    message = '只有经理或管理员才能执行此操作'
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_manager
        )


class CanEditInventory(permissions.BasePermission):
    """Permission class for users who can edit inventory."""
    
    message = '您没有权限编辑库存'
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.can_edit_inventory
        )


class CanViewAnalytics(permissions.BasePermission):
    """Permission class for users who can view analytics."""
    
    message = '您没有权限查看分析数据'
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.can_view_analytics
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission class for object owners or admins."""
    
    message = '您只能操作自己的资源'
    
    def has_object_permission(self, request: Request, view: APIView, obj) -> bool:
        if request.user.is_admin:
            return True
        return obj.user == request.user if hasattr(obj, 'user') else False
