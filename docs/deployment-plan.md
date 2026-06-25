# BrainBytes Deployment Plan

## 1. Environment Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub                              │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────────┐   │
│  │  Code   │  │ Lint & │  │ Build &│  │ Deploy to │   │
│  │  Push   │──▶│  Test  │──▶│Package │──▶│   OCI     │   │
│  └─────────┘  └────────┘  └────────┘  └───────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ Docker images via artifact
                           ▼
┌─────────────────── OCI Free Tier ───────────────────────┐
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │         VM.Standard.E2.1.Micro               │        │
│  │         (Ubuntu 22.04, 1 OCPU, 1 GB RAM)    │        │
│  │                                              │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │        │
│  │  │ Frontend │  │ Backend  │  │ MongoDB  │   │        │
│  │  │  :80     │◀─│  :3000   │◀─│  :27017  │   │        │
│  │  │  Next.js │  │ Express  │  │  mongo:7  │   │        │
│  │  └──────────┘  └──────────┘  └──────────┘   │        │
│  │                                              │        │
│  │  ┌──────────────────────────────────────┐    │        │
│  │  │  Block Volume — 50 GB (/mnt/brainbytes) │        │
│  │  │  ├── mongodb/  (database files)      │    │        │
│  │  │  ├── logs/     (application logs)    │    │        │
│  │  │  └── backups/  (database backups)    │    │        │
│  │  └──────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────── Security Layer ──────────────────┐     │
│  │  UFW Firewall │ Fail2Ban │ SSH Keys │ Auto-update│   │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User** → HTTPS → **Frontend** (Nginx on port 443/80)
2. **Frontend** → HTTP → **Backend API** (localhost:3000)
3. **Backend** → MongoDB driver → **MongoDB** (localhost:27017)
4. **Backend** → HTTPS → **Groq AI API** (external)
5. **GitHub Actions** → SSH/SCP → **OCI Instance** (deployment)

### Network Topology

| Segment | CIDR | Purpose |
|---------|------|---------|
| VCN | 10.0.0.0/16 | Main virtual network |
| Public Subnet | 10.0.1.0/24 | Compute instance, public endpoints |
| Internet Gateway | — | Public internet access |

---

## 2. Resource Specifications

| Resource | Specification | Justification |
|----------|--------------|---------------|
| Compute | VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM) | Always Free; sufficient for a low-traffic tutoring app |
| Boot Volume | 200 GB max | OS + Docker images |
| Block Volume | 50 GB | MongoDB data, logs, backups (separate from OS for safety) |
| MongoDB | mongo:7 Docker image | Upgrade from 4.4 for better stability |
| Frontend | Next.js (port 80) | Serves static + SSR React app |
| Backend | Express.js (port 3000) | REST API + Socket.io for real-time chat |

---

## 3. Security Implementation

### Access Control

| Layer | Method | Details |
|-------|--------|---------|
| SSH | Key-based authentication only | RSA 4096-bit keys, no password login |
| OS | Non-root user (`ubuntu`) | Sudo via SSH key only |
| Database | Localhost-only binding | MongoDB port not exposed to internet |
| API | Input validation | All endpoints validate request bodies |
| Secrets | GitHub Actions secrets | No secrets in code, only in env vars |

### Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `GROQ_API_KEY` | GitHub Secret | AI service authentication |
| `MONGO_URL` | docker-compose.yml | Database connection string |
| `NODE_ENV` | docker-compose.yml | Environment mode |
| `SNYK_TOKEN` | GitHub Secret | Security scanning auth |

### Data Protection

- **At rest**: MongoDB data stored on encrypted block volume
- **In transit**: HTTP in internal Docker network; HTTPS via Nginx reverse proxy for external
- **Backups**: Regular `mongodump` to `/mnt/brainbytes-data/backups/`

---

## 4. Deployment Procedures

### Step-by-Step Deployment

```yaml
# Triggered via GitHub Actions on push to main
name: Deploy to Oracle Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker images
        run: |
          docker build -t brainbytes-frontend ./frontend
          docker build -t brainbytes-backend ./backend
      
      - name: Save and transfer images
        run: |
          docker save brainbytes-frontend | gzip > frontend.tar.gz
          docker save brainbytes-backend | gzip > backend.tar.gz
          scp frontend.tar.gz backend.tar.gz ubuntu@${{ secrets.OCI_HOST }}:/tmp/
      
      - name: Deploy on OCI instance
        run: |
          ssh ubuntu@${{ secrets.OCI_HOST }} '
            docker load < /tmp/frontend.tar.gz
            docker load < /tmp/backend.tar.gz
            cd ~/brainbytes
            docker compose -f docker-compose.prod.yml up -d
          '
```

### Verification Steps

```bash
# After deployment, verify:
curl -s http://<OCI_PUBLIC_IP>/          # Should return 200
curl -s http://<OCI_PUBLIC_IP>:3000/     # Should return welcome message
curl -s http://<OCI_PUBLIC_IP>:3000/api/messages  # Should return JSON

docker ps  # All 3 containers should be running
docker logs brainbytes-backend   # No error messages
```

### Rollback Procedure

```bash
# Rollback to previous Docker image version
docker compose -f docker-compose.prod.yml down
docker tag brainbytes-frontend:previous brainbytes-frontend:latest
docker tag brainbytes-backend:previous brainbytes-backend:latest
docker compose -f docker-compose.prod.yml up -d

# Or restore from backup
mongorestore --drop /mnt/brainbytes-data/backups/latest/
```

---

## 5. Testing and Validation

### Post-Deployment Checklist

- [ ] Frontend loads without errors (HTTP 200)
- [ ] Backend API responds (HTTP 200 on `/`)
- [ ] Messages can be sent and received
- [ ] MongoDB connection successful
- [ ] Groq AI integration works
- [ ] All containers have <500 MB memory usage
- [ ] Disk usage below 80%
- [ ] SSL certificate valid (if configured)

### Performance Testing

```bash
# Test API response time
time curl -s http://localhost:3000/api/messages

# Test concurrent connections
sudo apt install -y apache2-utils
ab -n 100 -c 10 http://localhost:3000/
```

### Security Testing

```bash
# Test firewall rules
nmap -p 22,80,443,27017,3000 <OCI_PUBLIC_IP>

# Test for open ports (only 22, 80, 443, 3000 should be open)
```

---

## 6. Operational Procedures

### Routine Maintenance

| Frequency | Task | Command |
|-----------|------|---------|
| Daily | Check logs | `docker logs --tail 50 brainbytes-backend` |
| Weekly | System updates | `sudo apt update && sudo apt upgrade -y` |
| Weekly | Database backup | `mongodump --out /mnt/brainbytes-data/backups/$(date +%Y%m%d)` |
| Monthly | Audit SSH attempts | `sudo journalctl -u sshd \| grep "Failed password" \| wc -l` |

### Incident Response

1. **Service down**: SSH into instance → `docker compose ps` to check containers
2. **High memory**: `docker stats` → restart the offending container
3. **Disk full**: `du -sh /mnt/brainbytes-data/*` → archive old logs/backups
4. **Database corruption**: Restore from latest backup

### Backup and Recovery

```bash
# Full database backup
mongodump --out /mnt/brainbytes-data/backups/$(date +%Y%m%d_%H%M%S)

# Restore
mongorestore --drop /mnt/brainbytes-data/backups/<backup_date>
```

### Monitoring Procedures

- **Monitor.sh** runs every 5 minutes via cron
- Alerts logged to `/mnt/brainbytes-data/logs/monitor.log`
- Check `sudo journalctl -u docker` for container issues
- Check `df -h` for disk space weekly

---

## 7. Cost Management

### Free Tier Tracking

| Resource | Free Tier Limit | BrainBytes Usage |
|----------|----------------|------------------|
| Compute | 2 instances (AMD) | 1 instance |
| Block Volume | 200 GB total | 50 GB |
| Object Storage | 10 GB | Not used |
| Bandwidth | 10 TB/month | Minimal (text-based app) |

### Optimization Strategies

- **Docker layer caching**: Reduces build time and bandwidth
- **Log rotation**: Prevents logs from filling disk
- **Database indexing**: Optimizes query performance
- **Static asset optimization**: Next.js automatically optimizes images and JS bundles
- **Text-based responses**: AI responses are text, minimizing bandwidth
