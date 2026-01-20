from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    CurrentUserView,
    UpdateProfileView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    LoginHistoryView,
)

app_name = 'authentication'

urlpatterns = [
    # Auth endpoints
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('me/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('me/password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Admin user management endpoints
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    
    # Login history
    path('login-history/', LoginHistoryView.as_view(), name='login_history'),
]
