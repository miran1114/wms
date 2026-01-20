from __future__ import annotations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager supporting email as username."""
    
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError('用户名不能为空')
        if not email:
            raise ValueError('邮箱不能为空')
        
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.ROLE_ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    """Extended User model with roles and profile information."""
    
    # Role choices
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_ANALYST = 'analyst'
    ROLE_OPERATOR = 'operator'
    ROLE_VIEWER = 'viewer'
    
    ROLE_CHOICES = [
        (ROLE_ADMIN, '系统管理员'),
        (ROLE_MANAGER, '仓库经理'),
        (ROLE_ANALYST, '数据分析师'),
        (ROLE_OPERATOR, '操作员'),
        (ROLE_VIEWER, '访客'),
    ]
    
    # Extended fields
    email = models.EmailField('邮箱', unique=True)
    role = models.CharField('角色', max_length=20, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    phone = models.CharField('手机号', max_length=20, blank=True, null=True)
    department = models.CharField('部门', max_length=100, blank=True, null=True)
    avatar = models.URLField('头像URL', blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    last_login_ip = models.GenericIPAddressField('最后登录IP', blank=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self) -> bool:
        return self.role == self.ROLE_ADMIN or self.is_superuser
    
    @property
    def is_manager(self) -> bool:
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER] or self.is_superuser
    
    @property
    def can_edit_inventory(self) -> bool:
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER, self.ROLE_OPERATOR]
    
    @property
    def can_view_analytics(self) -> bool:
        return self.role in [self.ROLE_ADMIN, self.ROLE_MANAGER, self.ROLE_ANALYST]


class UserLoginHistory(models.Model):
    """Track user login history for audit purposes."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    login_at = models.DateTimeField('登录时间', auto_now_add=True)
    ip_address = models.GenericIPAddressField('IP地址', blank=True, null=True)
    user_agent = models.TextField('浏览器信息', blank=True, null=True)
    success = models.BooleanField('是否成功', default=True)
    failure_reason = models.CharField('失败原因', max_length=200, blank=True, null=True)
    
    class Meta:
        verbose_name = '登录历史'
        verbose_name_plural = '登录历史'
        ordering = ['-login_at']
    
    def __str__(self) -> str:
        status = '成功' if self.success else '失败'
        return f"{self.user.username} - {self.login_at} - {status}"
