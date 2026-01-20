@echo off
REM Development startup script for Windows

echo 🚀 Starting WMS Development Environment...

REM Check if Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Start development services
echo 📦 Starting Docker services...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for services
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak > nul

REM Create virtual environment if not exists
if not exist "venv" (
    echo 🐍 Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Run migrations
echo 🔄 Running database migrations...
python manage.py migrate

REM Create superuser if not exists
echo 👤 Setting up superuser...
python manage.py shell -c "from authentication.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin123', role='admin')"

echo.
echo ✅ Backend setup complete!
echo.
echo Now run the following commands in separate terminals:
echo.
echo Terminal 1 (Backend):
echo   cd %cd%
echo   venv\Scripts\activate
echo   python manage.py runserver
echo.
echo Terminal 2 (Frontend):
echo   cd %cd%
echo   npm install
echo   npm run dev
echo.
echo 🔗 Frontend: http://localhost:5173
echo 🔗 Backend API: http://localhost:8000/api/
echo 🔗 Admin: http://localhost:8000/admin/
echo 👤 Default login: admin / admin123
echo.
pause
