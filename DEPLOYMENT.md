# Yalavoch Deployment Guide - Hetzner VM

This guide walks you through deploying Yalavoch to a Hetzner Cloud VM.

## Prerequisites

- Hetzner Cloud account
- Domain name (e.g., `yalavoch.uz`) pointed to your server
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

---

## Step 1: Create Hetzner VM

### Via Hetzner Cloud Console

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create a new project or select existing
3. Click **Add Server**
4. Choose:
   - **Location**: Select nearest (e.g., Helsinki, Frankfurt)
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (2 vCPU, 4GB RAM) - recommended minimum
   - **SSH Key**: Add your SSH public key
5. Click **Create & Buy Now**

### Note Your Server IP

After creation, note the public IP address (e.g., `49.12.xxx.xxx`)

---

## Step 2: Configure DNS

Point your domain to the server:

```
A    @       49.12.xxx.xxx    (your server IP)
A    www     49.12.xxx.xxx    (your server IP)
```

Wait for DNS propagation (usually 5-30 minutes).

---

## Step 3: Initial Server Setup

### Connect to Server

```bash
ssh root@YOUR_SERVER_IP
```

### Update System & Install Docker

```bash
# Update packages
apt update && apt upgrade -y

# Install required packages
apt install -y curl git

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# (Optional) Add non-root user
adduser yalavoch
usermod -aG docker yalavoch
```

---

## Step 4: Deploy Application

### Clone Repository

```bash
# As root or your user
cd /opt
git clone https://github.com/YOUR_USERNAME/otp-telegram.git yalavoch
cd yalavoch
```

Or upload files via SCP:

```bash
# From your local machine
scp -r /path/to/otp-telegram root@YOUR_SERVER_IP:/opt/yalavoch
```

### Create Environment File

```bash
cd /opt/yalavoch
nano .env
```

Add the following (replace with your values):

```env
# Domain (for SSL certificate)
DOMAIN=yalavoch.uz

# Email for Let's Encrypt SSL certificate
ACME_EMAIL=your-email@example.com

# PostgreSQL Database
POSTGRES_USER=yalavoch
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE
POSTGRES_DB=yalavoch

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
BOT_USERNAME=yalavoch_bot

# Security
JWT_SECRET=generate_a_random_64_character_string_here
ADMIN_SECRET=your_admin_secret_for_api_management
```

Generate secure passwords:

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate POSTGRES_PASSWORD
openssl rand -base64 24
```

### Set File Permissions

```bash
chmod 600 .env
```

---

## Step 5: Build & Run

### Option A: Production with SSL (Recommended)

```bash
cd /opt/yalavoch

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Option B: Development/Testing (No SSL)

```bash
cd /opt/yalavoch

# Build and start
docker compose up -d --build

# Check logs
docker compose logs -f
```

---

## Step 6: Verify Deployment

### Check Running Containers

```bash
docker ps
```

You should see:
- `yalavoch-frontend` - Nginx serving the React app
- `yalavoch-backend` - Express API server
- `yalavoch-bot` - Telegram bot
- `yalavoch-db` - PostgreSQL database
- `yalavoch-traefik` - Reverse proxy (production only)

### Test Endpoints

```bash
# Health check
curl http://localhost/health

# With domain (after SSL)
curl https://yalavoch.uz/health
```

### Check Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f bot
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## Useful Commands

### Restart Services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker compose -f docker-compose.prod.yml down
```

### Rebuild After Code Changes

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### View Database

```bash
docker exec -it yalavoch-db psql -U yalavoch -d yalavoch
```

### Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

### Backup Database

```bash
docker exec yalavoch-db pg_dump -U yalavoch yalavoch > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i yalavoch-db psql -U yalavoch -d yalavoch
```

---

## Firewall Setup (Optional but Recommended)

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP & HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Monitoring & Maintenance

### View Resource Usage

```bash
docker stats
```

### Automatic Updates (Optional)

Install Watchtower for automatic container updates:

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --cleanup \
  --interval 86400
```

### Log Rotation

Docker logs can grow large. Configure log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:

```bash
systemctl restart docker
```

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Check Traefik logs
docker logs yalavoch-traefik

# Verify DNS is pointing to server
dig yalavoch.uz
nslookup yalavoch.uz
```

### Database Connection Issues

```bash
# Check if database is healthy
docker exec yalavoch-db pg_isready -U yalavoch

# Check database logs
docker logs yalavoch-db
```

### Bot Not Responding

```bash
# Check bot logs
docker logs yalavoch-bot

# Verify token is correct
# Ensure only ONE instance of bot is running
```

### Frontend Not Loading

```bash
# Check frontend logs
docker logs yalavoch-frontend

# Verify nginx config
docker exec yalavoch-frontend nginx -t
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik (SSL/Proxy)                       │
│                     Port 80, 443                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Nginx)                          │
│              Serves React app + proxies API                  │
└─────────────────────────────────────────────────────────────┘
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
┌──────────────────────┐    ┌──────────────────────┐
│      Backend         │    │     Telegram Bot     │
│   (Express API)      │    │     (grammY)         │
│     Port 3000        │    │                      │
└──────────────────────┘    └──────────────────────┘
                  │                       │
                  └───────────┬───────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                       Port 5432                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start Summary

```bash
# 1. SSH into server
ssh root@YOUR_SERVER_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 3. Clone/upload code
cd /opt
git clone YOUR_REPO yalavoch
cd yalavoch

# 4. Create .env file with your secrets
nano .env

# 5. Deploy
docker compose -f docker-compose.prod.yml up -d --build

# 6. Check status
docker ps
docker compose -f docker-compose.prod.yml logs -f
```

Your Yalavoch OTP service should now be running at `https://yalavoch.uz`! 🚀

