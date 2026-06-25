# BrainBytes Cloud Environment Setup — Oracle Cloud

## Overview

BrainBytes is deployed on **Oracle Cloud Infrastructure (OCI)** using the Always Free Tier. This document details the setup, security hardening, monitoring, and storage configuration for the production environment.

---

## 1. Compute Instance Setup

### Instance Specifications

| Property | Value |
|----------|-------|
| Shape | VM.Standard.E2.1.Micro (AMD) |
| OCPU | 1 |
| RAM | 1 GB |
| Boot Volume | Up to 200 GB (Always Free) |
| OS | Ubuntu 22.04 LTS Minimal |
| Region | AP-Singapore (for lowest latency to Philippines) |

### Initial Setup Steps

```bash
# Connect via SSH (key-based only)
ssh -i ~/.ssh/brainbytes-key ubuntu@<PUBLIC_IP>

# Update all system packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

# Install Node.js 22.x for build
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Security Hardening

### 2.1 Firewall Rules (iptables/UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 3000/tcp comment 'Backend API'

# Restrict SSH to known IPs if possible
sudo ufw allow from <YOUR_HOME_IP> to any port 22
sudo ufw --force enable
```

### 2.2 OCI Security List (VNC Firewall)

Configure in OCI Console → Networking → Security Lists:

| Direction | Source/Dest | Protocol | Port | Purpose |
|-----------|-------------|----------|------|---------|
| Ingress | 0.0.0.0/0 | TCP | 22 | SSH |
| Ingress | 0.0.0.0/0 | TCP | 80 | HTTP |
| Ingress | 0.0.0.0/0 | TCP | 443 | HTTPS |
| Ingress | 0.0.0.0/0 | TCP | 3000 | Backend API |
| Egress | 0.0.0.0/0 | All | All | Outbound access |

### 2.3 SSH Hardening

```bash
# Edit /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### 2.4 Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Choose "Yes" to enable automatic updates
```

### 2.5 Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

---

## 3. Block Volume Setup (Persistent Storage)

### 3.1 Create Block Volume

1. OCI Console → Storage → Block Volumes
2. Click **Create Block Volume**
3. Name: `brainbytes-data`
4. Size: **50 GB** (within free tier)
5. Availability Domain: Same as compute instance
6. Click **Create**

### 3.2 Attach to Instance

1. Click the block volume → **Attach**
2. Attachment type: **ISCSI** or **Paravirtualized**
3. Select your compute instance
4. Copy the iSCSI commands to attach

### 3.3 Format and Mount

```bash
# Run the iSCSI attach commands from OCI Console, then:
lsblk  # Identify the new disk (e.g., /dev/sdb)

# Format as ext4
sudo mkfs.ext4 /dev/sdb

# Create mount point
sudo mkdir -p /mnt/brainbytes-data

# Mount the volume
sudo mount /dev/sdb /mnt/brainbytes-data

# Configure auto-mount on reboot
echo '/dev/sdb /mnt/brainbytes-data ext4 defaults,_netdev,nofail 0 2' | sudo tee -a /etc/fstab

# Set permissions
sudo chown -R ubuntu:ubuntu /mnt/brainbytes-data
```

### 3.4 Configure for Application Data

```bash
# Create application data directories
mkdir -p /mnt/brainbytes-data/mongodb
mkdir -p /mnt/brainbytes-data/logs
mkdir -p /mnt/brainbytes-data/backups

# Update docker-compose.yml to use persistent volumes
# Add: - /mnt/brainbytes-data/mongodb:/data/db
```

---

## 4. System Monitoring

### 4.1 Install Monitoring Tools

```bash
# Install htop, iotop, nmon for system monitoring
sudo apt install -y htop iotop nmon net-tools

# Install Prometheus Node Exporter for OCI monitoring
wget https://github.com/prometheus/node_exporter/releases/latest/download/node_exporter-1.8.2.linux-amd64.tar.gz
tar xvf node_exporter-*.tar.gz
sudo mv node_exporter-*/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

### 4.2 Log Rotation

```bash
# Configure log rotation for Docker containers
sudo tee /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
    maxsize 50M
}
EOF

# Configure log rotation for application logs
sudo tee /etc/logrotate.d/brainbytes-app << EOF
/mnt/brainbytes-data/logs/*.log {
    rotate 14
    daily
    compress
    missingok
    notifempty
    maxsize 10M
}
EOF
```

### 4.3 Health Check Monitoring Script

```bash
# Create monitoring script
cat > /home/ubuntu/monitor.sh << 'SCRIPT'
#!/bin/bash
# BrainBytes Health Monitoring Script
# Runs via cron every 5 minutes

LOG_FILE="/mnt/brainbytes-data/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if Docker is running
if ! systemctl is-active --quiet docker; then
    echo "$DATE [ERROR] Docker is not running" >> $LOG_FILE
    sudo systemctl start docker
fi

# Check container health
for container in brainbytes-frontend brainbytes-backend brainbytes-mongo; do
    if ! docker ps --format '{{.Names}}' | grep -q "$container"; then
        echo "$DATE [WARN] Container $container is down, restarting..." >> $LOG_FILE
        cd /home/ubuntu/brainbytes && docker compose up -d
        break
    fi
done

# Check disk usage
USAGE=$(df /mnt/brainbytes-data | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
    echo "$DATE [WARN] Disk usage at ${USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM" -gt 90 ]; then
    echo "$DATE [WARN] Memory usage at ${MEM}%" >> $LOG_FILE
fi

# API health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "$DATE [ERROR] Backend API returned $HTTP_CODE" >> $LOG_FILE
fi

echo "$DATE [INFO] Health check complete" >> $LOG_FILE
SCRIPT

chmod +x /home/ubuntu/monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/monitor.sh") | crontab -
```

---

## 5. Docker Compose Deployment

### Production docker-compose.yml

```yaml
# docker-compose.prod.yml
version: '3'

services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - /mnt/brainbytes-data/mongodb:/data/db
    ports:
      - "127.0.0.1:27017:27017"  # Not exposed publicly

  backend:
    image: brainbytes-backend:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - MONGO_URL=mongodb://mongo:27017/brainbytes
      - GROQ_API_KEY=${GROQ_API_KEY}
      - NODE_ENV=production
      - PORT=3000
    depends_on:
      - mongo
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: brainbytes-frontend:latest
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 6. Domain & SSL (Optional)

```bash
# Install Nginx as reverse proxy for SSL termination
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo tee /etc/nginx/sites-available/brainbytes << 'NGINX'
server {
    listen 80;
    server_name brainbytes.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/brainbytes /etc/nginx/sites-enabled/
sudo certbot --nginx -d brainbytes.yourdomain.com
```

---

## 7. Verification Checklist

- [ ] SSH key-based authentication only (no password)
- [ ] UFW firewall enabled with restricted ports
- [ ] Automatic security updates configured
- [ ] Fail2Ban installed and running
- [ ] Block volume attached, formatted, and mounted
- [ ] Block volume added to `/etc/fstab` for persistence
- [ ] Docker and Docker Compose installed
- [ ] Log rotation configured
- [ ] Monitoring script deployed and cron job active
- [ ] All application containers healthy
- [ ] SSL certificate issued (if using custom domain)
