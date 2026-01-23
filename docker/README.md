# Docker Setup for PostgreSQL + pgAdmin

Complete Docker environment cho English Chatbot với PostgreSQL database.

## 🚀 Quick Start

### 1. Start PostgreSQL + pgAdmin

```bash
# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **pgAdmin** | http://localhost:5050 | Email: `admin@chatbot.local`<br/>Password: `admin123` |
| **PostgreSQL** | localhost:5432 | User: `postgres`<br/>Password: `postgres123`<br/>Database: `chatbot` |

### 3. Migration Phase (Optional)

```bash
# Start with MySQL + phpMyAdmin for migration
docker-compose --profile migration up -d

# Access phpMyAdmin
# URL: http://localhost:8080
# User: root
# Password: 123456
```

---

## 📁 Structure

```
docker-compose.yml          ← Main Docker Compose file
.env                        ← Environment variables (create from .env.example)
.env.example               ← Template
docker/
  └── pgadmin/
      └── servers.json     ← Pre-configured PostgreSQL connection
backups/
  ├── postgresql/          ← PostgreSQL backups
  └── mysql/               ← MySQL backups (migration)
```

---

## 🐳 Services

### PostgreSQL (Always Running)
- **Image:** postgres:15-alpine
- **Port:** 5432
- **Database:** chatbot
- **Auto-init:** Runs `.migration/postgresql/*.sql` on first start
- **Data:** Persisted in `postgres_data` volume

### pgAdmin 4 (Always Running)
- **Image:** dpage/pgadmin4:latest
- **Port:** 5050
- **Auto-configured:** Connects to PostgreSQL automatically
- **Data:** Persisted in `pgadmin_data` volume

### MySQL (Migration Phase Only)
- **Image:** mysql:8.0
- **Port:** 3306
- **Profile:** `migration` (optional)
- **Data:** Persisted in `mysql_data` volume

### phpMyAdmin (Migration Phase Only)
- **Image:** phpmyadmin:latest
- **Port:** 8080
- **Profile:** `migration` (optional)

---

## 📋 Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a service
docker-compose restart postgres

# View logs
docker-compose logs -f postgres
docker-compose logs -f pgadmin

# Check status
docker-compose ps
```

### Database Operations

```bash
# Connect to PostgreSQL via CLI
docker exec -it chatbot-postgres psql -U postgres -d chatbot

# Run SQL file
docker exec -i chatbot-postgres psql -U postgres -d chatbot < backup.sql

# Create backup
docker exec chatbot-postgres pg_dump -U postgres chatbot > backup.sql

# Restore backup
docker exec -i chatbot-postgres psql -U postgres -d chatbot < backup.sql
```

### Data Management

```bash
# Remove all data (WARNING: Deletes everything)
docker-compose down -v

# Remove only PostgreSQL data
docker volume rm chatbot_postgres_data

# Backup volumes
docker run --rm -v chatbot_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v chatbot_postgres_data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```bash
# PostgreSQL
POSTGRES_DB=chatbot
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123  # CHANGE IN PRODUCTION!
POSTGRES_PORT=5432

# pgAdmin
PGADMIN_EMAIL=admin@chatbot.local
PGADMIN_PASSWORD=admin123      # CHANGE IN PRODUCTION!
PGADMIN_PORT=5050
```

### pgAdmin Settings

1. **First Login:** http://localhost:5050
2. **Email:** admin@chatbot.local
3. **Password:** admin123
4. **Server already configured!** - "Chatbot PostgreSQL (Local)"
5. **Server password:** postgres123

---

## 🎯 pgAdmin Usage

### Connect to Database

1. Open http://localhost:5050
2. Login with credentials
3. **Server already added!** Click "Chatbot PostgreSQL (Local)"
4. Enter password: `postgres123`
5. Browse databases → `chatbot`

### Run Queries

1. Right-click database → Query Tool
2. Write SQL queries
3. Execute with F5 or Execute button

### Import/Export Data

**Import CSV:**
1. Right-click table → Import/Export
2. Select file
3. Configure columns
4. Import

**Export Database:**
1. Right-click database → Backup
2. Choose format (SQL, tar, directory)
3. Download

### View Data

1. Navigate to table
2. Right-click → View/Edit Data → All Rows

---

## 🔄 Migration Workflow

### Phase 1: Parallel Running (Week 1-2)

```bash
# Start both MySQL and PostgreSQL
docker-compose --profile migration up -d

# Access both admin panels
# MySQL: http://localhost:8080 (phpMyAdmin)
# PostgreSQL: http://localhost:5050 (pgAdmin)

# Compare data between databases
```

### Phase 2: Migration (Week 2)

```bash
# Export from MySQL
docker exec chatbot-mysql mysqldump -u root -p123456 chatbot > mysql_dump.sql

# Transform data (if needed)
# ... run transformation scripts ...

# Import to PostgreSQL
docker exec -i chatbot-postgres psql -U postgres -d chatbot < transformed_data.sql
```

### Phase 3: PostgreSQL Only (Week 3+)

```bash
# Stop MySQL services
docker-compose stop mysql phpmyadmin

# Continue with PostgreSQL only
docker-compose up -d postgres pgadmin

# Remove MySQL (when confident)
docker-compose down mysql phpmyadmin
docker volume rm chatbot_mysql_data
```

---

## 🛠️ Troubleshooting

### PostgreSQL won't start

```bash
# Check logs
docker-compose logs postgres

# Common issues:
# - Port 5432 already in use
# - Wrong password
# - Volume permission issues

# Fix: Change port in .env
POSTGRES_PORT=5433
```

### pgAdmin can't connect

```bash
# Check if PostgreSQL is healthy
docker-compose ps

# Should show "healthy" status
# If not, check PostgreSQL logs

# Reset pgAdmin data
docker-compose down
docker volume rm chatbot_pgadmin_data
docker-compose up -d
```

### Slow performance

```bash
# Increase PostgreSQL memory
# Edit docker-compose.yml, add under postgres:
command: 
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "max_connections=200"
```

### Init scripts not running

```bash
# Scripts only run on FIRST start
# To re-run, remove volume:
docker-compose down
docker volume rm chatbot_postgres_data
docker-compose up -d

# Check logs
docker-compose logs postgres
```

---

## 📊 Performance Tips

### PostgreSQL Optimization

Add to `docker-compose.yml` under postgres → command:

```yaml
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
  - "-c"
  - "maintenance_work_mem=64MB"
  - "-c"
  - "checkpoint_completion_target=0.9"
  - "-c"
  - "wal_buffers=16MB"
  - "-c"
  - "default_statistics_target=100"
  - "-c"
  - "random_page_cost=1.1"
  - "-c"
  - "effective_io_concurrency=200"
  - "-c"
  - "work_mem=4MB"
  - "-c"
  - "min_wal_size=1GB"
  - "-c"
  - "max_wal_size=4GB"
```

### Connection Pooling

Use PgBouncer (add to docker-compose.yml):

```yaml
pgbouncer:
  image: pgbouncer/pgbouncer
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_DBNAME: chatbot
  ports:
    - "6432:6432"
```

---

## 🔐 Security Best Practices

### Production Changes

1. **Change all passwords:**
   ```bash
   POSTGRES_PASSWORD=<strong-random-password>
   PGADMIN_PASSWORD=<strong-random-password>
   ```

2. **Don't expose ports** (use reverse proxy):
   ```yaml
   # Remove ports, use nginx
   # ports:
   #   - "5432:5432"
   ```

3. **Use secrets:**
   ```yaml
   secrets:
     postgres_password:
       file: ./secrets/postgres_password.txt
   ```

4. **Enable SSL:**
   ```yaml
   environment:
     POSTGRES_HOST_AUTH_METHOD: scram-sha-256
   ```

---

## 📚 Additional Resources

### PostgreSQL
- [Official Docs](https://www.postgresql.org/docs/15/)
- [Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Docker Image](https://hub.docker.com/_/postgres)

### pgAdmin
- [Official Docs](https://www.pgadmin.org/docs/)
- [Docker Image](https://hub.docker.com/r/dpage/pgadmin4)
- [Server Config](https://www.pgadmin.org/docs/pgadmin4/latest/import_export_servers.html)

---

**Created:** 2026-01-23  
**Version:** 1.0.0  
**Status:** ✅ Ready for Use
