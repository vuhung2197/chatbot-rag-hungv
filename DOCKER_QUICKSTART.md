# Quick Start Guide - Docker PostgreSQL + pgAdmin

## 🚀 1-Minute Setup

```bash
# 1. Copy environment file (if not exists)
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Wait for services to be ready (~30 seconds)
docker-compose ps

# 4. Done! Access pgAdmin
# URL: http://localhost:5050
# Email: admin@chatbot.local
# Password: admin123
```

## ✅ Verify Installation

### Check Services

```bash
# All services should show "Up" and "healthy"
docker-compose ps

# Expected output:
# chatbot-postgres   Up (healthy)
# chatbot-pgadmin    Up
```

### Access pgAdmin

1. Open browser: http://localhost:5050
2. Login:
   - Email: `admin@chatbot.local`
   - Password: `admin123`
3. Click "Chatbot PostgreSQL (Local)" server
4. Enter password: `postgres123`
5. ✅ Connected! Browse `chatbot` database

### Test Database

```bash
# Connect via CLI
docker exec -it chatbot-postgres psql -U postgres -d chatbot

# Run test query
SELECT COUNT(*) FROM users;

# Exit
\q
```

## 📊 Common Tasks

### View Logs

```bash
# PostgreSQL logs
docker-compose logs -f postgres

# pgAdmin logs
docker-compose logs -f pgadmin
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

### Stop Services

```bash
# Stop (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop and remove everything INCLUDING DATA
docker-compose down -v  # ⚠️ WARNING: Deletes all data!
```

### Backup Database

```bash
# Create backup
docker exec chatbot-postgres pg_dump -U postgres chatbot > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i chatbot-postgres psql -U postgres -d chatbot < backup_20260123.sql
```

## 🔧 Change Ports (if conflicts)

Edit `.env`:

```bash
# Change PostgreSQL port
POSTGRES_PORT=5433

# Change pgAdmin port
PGADMIN_PORT=5051

# Restart
docker-compose down
docker-compose up -d
```

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Error: "port is already allocated"

# Solution 1: Change port in .env
POSTGRES_PORT=5433

# Solution 2: Stop conflicting service
# On Windows: Services → PostgreSQL → Stop
```

### Can't Connect from pgAdmin

```bash
# Check PostgreSQL is healthy
docker-compose ps

# If not healthy, check logs
docker-compose logs postgres

# Restart everything
docker-compose restart
```

### Forgot Password

```bash
# Reset by editing .env and restarting
docker-compose down
# Edit .env with new passwords
docker-compose up -d
```

## 📚 Next Steps

- Read full docs: `docker/README.md`
- Run init scripts: `.migration/postgresql/`
- Configure app: Update `backend/db.js`

## 🎯 URLs Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| pgAdmin | http://localhost:5050 | admin@chatbot.local / admin123 |
| PostgreSQL | localhost:5432 | postgres / postgres123 |

---

**Need help?** Check `docker/README.md` for detailed documentation.
