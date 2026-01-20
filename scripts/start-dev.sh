#!/bin/bash
# Development startup script

echo "🚀 Starting WMS Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start development services (DB, Redis, Ollama)
echo "📦 Starting Docker services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Run migrations
echo "🔄 Running database migrations..."
python manage.py migrate

# Create superuser if not exists
echo "👤 Checking for superuser..."
python manage.py shell -c "
from authentication.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123', role='admin')
    print('Superuser created: admin / admin123')
else:
    print('Superuser already exists')
"

# Start Django server in background
echo "🎯 Starting Django development server..."
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Start Vite dev server
echo "🌐 Starting Vite development server..."
npm run dev &
VITE_PID=$!

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🔗 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://localhost:8000/api/"
echo "🔗 Admin: http://localhost:8000/admin/"
echo "👤 Default login: admin / admin123"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $DJANGO_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    docker-compose -f docker-compose.dev.yml down
    echo "👋 Goodbye!"
}
trap cleanup EXIT

# Wait for Ctrl+C
wait
