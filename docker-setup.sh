#!/bin/bash

# ============================================
# Docker Setup Script
# Auto-setup PostgreSQL + pgAdmin environment
# ============================================

set -e  # Exit on error

echo "🐳 Setting up Docker environment for English Chatbot..."
echo ""

# ============================================
# 1. Check Prerequisites
# ============================================

echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first:"
    echo "   https://www.docker.com/get-started"
    exit 1
fi
echo "✅ Docker found: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi
echo "✅ Docker Compose found: $(docker-compose --version)"

# Check Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo "✅ Docker is running"

echo ""

# ============================================
# 2. Setup Environment File
# ============================================

echo "🔧 Setting up environment file..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "⚠️  .env.example not found, creating default .env"
        cat > .env << 'EOF'
POSTGRES_DB=chatbot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_PORT=5432

PGADMIN_EMAIL=admin@chatbot.local
PGADMIN_PASSWORD=admin123
PGADMIN_PORT=5050
EOF
        echo "✅ Created default .env file"
    fi
else
    echo "ℹ️  .env already exists, skipping"
fi

echo ""

# ============================================
# 3. Create Required Directories
# ============================================

echo "📁 Creating required directories..."

mkdir -p backups/postgresql
mkdir -p backups/mysql
mkdir -p docker/pgadmin

echo "✅ Directories created"
echo ""

# ============================================
# 4. Pull Docker Images
# ============================================

echo "📥 Pulling Docker images..."

docker-compose pull postgres pgadmin

echo "✅ Images pulled"
echo ""

# ============================================
# 5. Start Services
# ============================================

echo "🚀 Starting services..."

docker-compose up -d postgres pgadmin

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Wait for PostgreSQL to be healthy
echo "   Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; do
    echo -n "."
    sleep 1
done
echo " ✅"

echo ""

# ============================================
# 6. Verify Installation
# ============================================

echo "🔍 Verifying installation..."

# Check services are running
if docker-compose ps | grep -q "chatbot-postgres.*Up"; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
fi

if docker-compose ps | grep -q "chatbot-pgadmin.*Up"; then
    echo "✅ pgAdmin is running"
else
    echo "❌ pgAdmin failed to start"
    docker-compose logs pgadmin
    exit 1
fi

echo ""

# ============================================
# 7. Success Message
# ============================================

echo "🎉 Setup complete!"
echo ""
echo "📊 Services Status:"
echo "─────────────────────────────────────────────────────"
docker-compose ps
echo "─────────────────────────────────────────────────────"
echo ""
echo "🌐 Access URLs:"
echo "   pgAdmin:     http://localhost:5050"
echo "   PostgreSQL:  localhost:5432"
echo ""
echo "🔑 Credentials:"
echo "   pgAdmin Email:    admin@chatbot.local"
echo "   pgAdmin Password: admin123"
echo "   PostgreSQL User:  postgres"
echo "   PostgreSQL Pass:  postgres123"
echo ""
echo "📚 Next Steps:"
echo "   1. Open pgAdmin: http://localhost:5050"
echo "   2. Login with credentials above"
echo "   3. Server 'Chatbot PostgreSQL' is pre-configured!"
echo "   4. Run schema init: docker exec -i chatbot-postgres psql -U postgres -d chatbot < .migration/postgresql/000_init_master.sql"
echo ""
echo "💡 Useful Commands:"
echo "   Stop:    docker-compose stop"
echo "   Start:   docker-compose start"
echo "   Logs:    docker-compose logs -f"
echo "   Remove:  docker-compose down"
echo ""
echo "📖 Full docs: docker/README.md"
echo ""
