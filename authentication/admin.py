from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserLoginHistory


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'created_at']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('扩展信息', {
            'fields': ('role', 'phone', 'department', 'avatar', 'last_login_ip')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('扩展信息', {
            'fields': ('email', 'role', 'phone', 'department')
        }),
    )


@admin.register(UserLoginHistory)
class UserLoginHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'login_at', 'ip_address', 'success', 'failure_reason']
    list_filter = ['success', 'login_at']
    search_fields = ['user__username', 'ip_address']
    ordering = ['-login_at']
    readonly_fields = ['user', 'login_at', 'ip_address', 'user_agent', 'success', 'failure_reason']
