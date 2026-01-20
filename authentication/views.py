from __future__ import annotations

from django.contrib.auth import update_session_auth_hash
from rest_framework import generics, permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.models import OperationLog
from .models import User, UserLoginHistory
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    LoginHistorySerializer,
)
from .permissions import IsAdminUser, IsManagerOrAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view with login history tracking."""
    
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request: Request, *args, **kwargs) -> Response:
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Successful login
            username = request.data.get('username')
            try:
                user = User.objects.get(username=username)
                UserLoginHistory.objects.create(
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=True
                )
                user.last_login_ip = ip_address
                user.save(update_fields=['last_login_ip'])
                
                OperationLog.objects.create(
                    user_id=str(user.id),
                    username=user.username,
                    operation_type='USER_LOGIN',
                    operation_detail=f'用户 {user.username} 登录成功',
                    ip_address=ip_address
                )
            except User.DoesNotExist:
                pass
        else:
            # Failed login
            username = request.data.get('username', 'unknown')
            try:
                user = User.objects.get(username=username)
                UserLoginHistory.objects.create(
                    user=user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason='密码错误'
                )
            except User.DoesNotExist:
                pass
        
        return response
    
    @staticmethod
    def get_client_ip(request: Request) -> str:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class RegisterView(generics.CreateAPIView):
    """User registration view."""
    
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        OperationLog.objects.create(
            user_id=str(user.id),
            username=user.username,
            operation_type='USER_REGISTER',
            operation_detail=f'新用户注册: {user.username}',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '注册成功',
            'data': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    """Get current user profile."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request: Request) -> Response:
        serializer = UserSerializer(request.user)
        return Response({
            'code': 0,
            'data': serializer.data
        })


class UpdateProfileView(generics.UpdateAPIView):
    """Update current user profile."""
    
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'code': 0,
            'message': '个人资料更新成功',
            'data': UserSerializer(instance).data
        })


class ChangePasswordView(APIView):
    """Change user password."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request: Request) -> Response:
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        update_session_auth_hash(request, user)
        
        OperationLog.objects.create(
            user_id=str(user.id),
            username=user.username,
            operation_type='PASSWORD_CHANGE',
            operation_detail=f'用户 {user.username} 修改了密码',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '密码修改成功'
        })


class UserListView(generics.ListAPIView):
    """List all users (admin only)."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Search by username or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(username__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )
        
        return queryset
    
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


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """User detail view (admin only)."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
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
            user_id=str(request.user.id),
            username=request.user.username,
            operation_type='USER_UPDATE',
            operation_detail=f'管理员 {request.user.username} 更新了用户 {instance.username} 的信息',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '用户信息更新成功',
            'data': serializer.data
        })
    
    def destroy(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        username = instance.username
        
        if instance == request.user:
            return Response({
                'code': 1,
                'message': '不能删除当前登录用户'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_destroy(instance)
        
        OperationLog.objects.create(
            user_id=str(request.user.id),
            username=request.user.username,
            operation_type='USER_DELETE',
            operation_detail=f'管理员 {request.user.username} 删除了用户 {username}',
            ip_address=request.META.get('REMOTE_ADDR', '')
        )
        
        return Response({
            'code': 0,
            'message': '用户删除成功'
        })


class LoginHistoryView(generics.ListAPIView):
    """View login history."""
    
    serializer_class = LoginHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            # Admin can see all login history
            return UserLoginHistory.objects.all()
        # Regular users can only see their own history
        return UserLoginHistory.objects.filter(user=user)
    
    def list(self, request: Request, *args, **kwargs) -> Response:
        queryset = self.filter_queryset(self.get_queryset())[:100]  # Limit to 100 records
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'data': {
                'list': serializer.data,
                'total': queryset.count()
            }
        })
