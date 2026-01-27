# ============================================
# Docker Setup Script (PowerShell)
# Auto-setup PostgreSQL + pgAdmin environment
# ============================================

Write-Host "[Docker Setup] Starting..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Check Prerequisites
# ============================================

Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker found: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "[ERROR] Docker not found. Please install Docker Desktop:" -ForegroundColor Red
    Write-Host "        https://www.docker.com/get-started" -ForegroundColor Yellow
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker Compose found: $composeVersion" -ForegroundColor Green
    } else {
        throw "Docker Compose not found"
    }
} catch {
    Write-Host "[ERROR] Docker Compose not found" -ForegroundColor Red
    exit 1
}

# Check Docker is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker is running" -ForegroundColor Green
    } else {
        throw "Docker not running"
    }
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# 2. Setup Environment File
# ============================================

Write-Host "[2/7] Setting up environment file..." -ForegroundColor Yellow

if (!(Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    } else {
        Write-Host "[WARN] .env.example not found, creating default" -ForegroundColor Yellow
        @"
POSTGRES_DB=chatbot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_PORT=5432

PGADMIN_EMAIL=admin@chatbot.local
PGADMIN_PASSWORD=admin123
PGADMIN_PORT=5050
"@ | Set-Content .env
        Write-Host "[OK] Created default .env file" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] .env already exists, skipping" -ForegroundColor Cyan
}

Write-Host ""

# ============================================
# 3. Create Required Directories
# ============================================

Write-Host "[3/7] Creating required directories..." -ForegroundColor Yellow

$directories = @(
    "backups\postgresql",
    "backups\mysql",
    "docker\pgadmin"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "[OK] Directories created" -ForegroundColor Green
Write-Host ""

# ============================================
# 4. Pull Docker Images
# ============================================

Write-Host "[4/7] Pulling Docker images..." -ForegroundColor Yellow

docker-compose pull postgres pgadmin

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Images pulled" -ForegroundColor Green
} else {
    Write-Host "[WARN] Failed to pull some images" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 5. Start Services
# ============================================

Write-Host "[5/7] Starting services..." -ForegroundColor Yellow

docker-compose up -d postgres pgadmin

Write-Host ""
Write-Host "[WAIT] Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Wait for PostgreSQL to be healthy
Write-Host "       Waiting for PostgreSQL" -NoNewline
do {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
    $pgReady = docker-compose exec -T postgres pg_isready -U postgres 2>$null
} while ($LASTEXITCODE -ne 0)
Write-Host " [OK]" -ForegroundColor Green

Write-Host ""

# ============================================
# 6. Verify Installation
# ============================================

Write-Host "[6/7] Verifying installation..." -ForegroundColor Yellow

$services = docker-compose ps

if ($services -match "chatbot-postgres.*Up") {
    Write-Host "[OK] PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "[ERROR] PostgreSQL failed to start" -ForegroundColor Red
    docker-compose logs postgres
    exit 1
}

if ($services -match "chatbot-pgadmin.*Up") {
    Write-Host "[OK] pgAdmin is running" -ForegroundColor Green
} else {
    Write-Host "[ERROR] pgAdmin failed to start" -ForegroundColor Red
    docker-compose logs pgadmin
    exit 1
}

Write-Host ""

# ============================================
# 7. Success Message
# ============================================

Write-Host "[7/7] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "DOCKER SETUP SUCCESSFUL" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Cyan
Write-Host "-----------------------------------------------" -ForegroundColor Gray
docker-compose ps
Write-Host "-----------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  pgAdmin:     http://localhost:5050" -ForegroundColor White
Write-Host "  PostgreSQL:  localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Cyan
Write-Host "  pgAdmin Email:    admin@chatbot.local" -ForegroundColor White
Write-Host "  pgAdmin Password: admin123" -ForegroundColor White
Write-Host "  PostgreSQL User:  postgres" -ForegroundColor White
Write-Host "  PostgreSQL Pass:  postgres123" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open pgAdmin: http://localhost:5050" -ForegroundColor White
Write-Host "  2. Login with credentials above" -ForegroundColor White
Write-Host "  3. Server 'Chatbot PostgreSQL' is pre-configured!" -ForegroundColor White
Write-Host "  4. Run init script (optional):" -ForegroundColor White
Write-Host "     Get-Content .migration\postgresql\000_init_master.sql | docker exec -i chatbot-postgres psql -U postgres -d chatbot" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  Stop:    docker-compose stop" -ForegroundColor White
Write-Host "  Start:   docker-compose start" -ForegroundColor White
Write-Host "  Logs:    docker-compose logs -f" -ForegroundColor White
Write-Host "  Remove:  docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "Full docs: docker\README.md" -ForegroundColor Cyan
Write-Host ""
