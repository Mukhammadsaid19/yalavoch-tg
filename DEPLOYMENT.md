# Yalavoch Deployment Guide - Hetzner VM + Cloudflare

This guide walks you through deploying Yalavoch to a Hetzner Cloud VM with Cloudflare for DNS and SSL.

## Prerequisites

- Hetzner Cloud account
- Cloudflare account (free tier works)
- Domain name (e.g., `alavo.uz`) managed by Cloudflare
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

## Step 2: Configure Cloudflare DNS

### Add Your Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Add a Site** and enter your domain
3. Select the **Free** plan
4. Cloudflare will scan existing DNS records
5. Update your domain's nameservers at your registrar to Cloudflare's nameservers

### Configure DNS Records

In Cloudflare DNS settings, add:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | 49.12.xxx.xxx (your server IP) | Proxied (orange cloud) |
| A | www | 49.12.xxx.xxx (your server IP) | Proxied (orange cloud) |

### Configure SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full** (recommended) or **Full (Strict)**
   - **Full**: Encrypts traffic between Cloudflare and your server (self-signed cert OK)
   - **Full (Strict)**: Requires valid SSL certificate on your server

3. Go to **SSL/TLS** → **Edge Certificates**
   - Enable **Always Use HTTPS**
   - Enable **Automatic HTTPS Rewrites**

### (Recommended) Create Origin Certificate

For **Full (Strict)** mode, create a Cloudflare Origin Certificate:

1. Go to **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Choose:
   - Private key type: **RSA (2048)**
   - Hostnames: `alavo.uz`, `*.alavo.uz`
   - Certificate validity: **15 years**
4. Click **Create**
5. **Save both the certificate and private key** - you'll need these later

Wait for DNS propagation (usually instant with Cloudflare).

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
# Domain
DOMAIN=alavo.uz

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

### (Optional) Setup Cloudflare Origin Certificate

If using **Full (Strict)** SSL mode, add the Origin Certificate:

```bash
# Create SSL directory
mkdir -p /opt/yalavoch/ssl

# Create certificate file (paste from Cloudflare)
nano /opt/yalavoch/ssl/origin.pem

# Create private key file (paste from Cloudflare)
nano /opt/yalavoch/ssl/origin-key.pem

# Set permissions
chmod 600 /opt/yalavoch/ssl/*
```

---

## Step 5: Build & Run

### Production with Cloudflare (Recommended)

Since Cloudflare handles SSL termination, we use a simpler setup:

```bash
cd /opt/yalavoch

# Build and start all services
docker compose -f docker-compose.cloudflare.yml up -d --build

# Check logs
docker compose -f docker-compose.cloudflare.yml logs -f
```

### Alternative: Development/Testing (Local only)

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

### Test Endpoints

```bash
# Health check (locally)
curl http://localhost/health

# Via Cloudflare (should work with HTTPS)
curl https://alavo.uz/health
```

### Check Logs

```bash
# All services
docker compose -f docker-compose.cloudflare.yml logs -f

# Specific service
docker compose -f docker-compose.cloudflare.yml logs -f backend
docker compose -f docker-compose.cloudflare.yml logs -f bot
docker compose -f docker-compose.cloudflare.yml logs -f frontend
```

---

## Useful Commands

### Restart Services

```bash
docker compose -f docker-compose.cloudflare.yml restart
```

### Stop Services

```bash
docker compose -f docker-compose.cloudflare.yml down
```

### Rebuild After Code Changes

```bash
docker compose -f docker-compose.cloudflare.yml up -d --build
```

### View Database

```bash
docker exec -it yalavoch-db psql -U yalavoch -d yalavoch
```

### Run Database Migrations

```bash
docker compose -f docker-compose.cloudflare.yml run --rm migrate
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

### SSL/HTTPS Issues

**Error 525 (SSL Handshake Failed)**:
- Check SSL mode in Cloudflare is set to **Full** (not Full Strict) if not using Origin Certificate
- If using Origin Certificate, ensure files are mounted correctly

**Error 521 (Web Server is Down)**:
- Verify containers are running: `docker ps`
- Check if port 80 is exposed: `curl http://localhost/health`

**Mixed Content Warnings**:
- Enable **Automatic HTTPS Rewrites** in Cloudflare SSL/TLS settings

```bash
# Verify DNS is pointing through Cloudflare
dig alavo.uz

# Check if your server is accessible
curl -I http://YOUR_SERVER_IP/health
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

### Cloudflare-Specific Issues

**Requests Timing Out**:
- Check Cloudflare Firewall rules aren't blocking requests
- Verify your server IP isn't being rate-limited

**Orange Cloud (Proxy) Issues**:
- Test with proxy disabled (grey cloud) temporarily
- Check Cloudflare → Analytics for blocked requests

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare (CDN/SSL)                      │
│               DNS, DDoS Protection, SSL/TLS                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hetzner VM (Your Server)                   │
│                       Port 80/443                            │
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

# 5. Deploy with Cloudflare
docker compose -f docker-compose.cloudflare.yml up -d --build

# 6. Check status
docker ps
docker compose -f docker-compose.cloudflare.yml logs -f
```

Your Yalavoch OTP service should now be running at `https://alavo.uz`! 🚀

---

## Cloudflare Benefits

- ✅ **Free SSL/TLS** - No need for Let's Encrypt setup
- ✅ **DDoS Protection** - Built-in attack mitigation
- ✅ **CDN Caching** - Faster static asset delivery
- ✅ **Hidden Origin IP** - Your server IP stays private
- ✅ **Analytics** - Traffic insights and security reports
- ✅ **Firewall Rules** - Block malicious traffic easily

---

## Additional Cloudflare DNS & Security Configuration

### Complete DNS Records Setup

Add these records in Cloudflare DNS settings:

| Type | Name | Content | Proxy Status | TTL | Notes |
|------|------|---------|--------------|-----|-------|
| A | @ | YOUR_SERVER_IP | Proxied ☁️ | Auto | Main domain |
| A | www | YOUR_SERVER_IP | Proxied ☁️ | Auto | WWW subdomain |
| A | api | YOUR_SERVER_IP | Proxied ☁️ | Auto | Optional: API subdomain |
| CNAME | * | alavo.uz | DNS Only ⚪ | Auto | Optional: Wildcard catch-all |
| TXT | @ | v=spf1 -all | N/A | Auto | Prevents email spoofing |
| TXT | _dmarc | v=DMARC1; p=reject; | N/A | Auto | Email authentication |
| CAA | @ | 0 issue "letsencrypt.org" | N/A | Auto | CA Authorization |
| CAA | @ | 0 issuewild ";" | N/A | Auto | Prevent wildcard certs |

### Cloudflare Security Settings

#### 1. SSL/TLS Configuration

Go to **SSL/TLS** → **Overview**:
- ✅ Set encryption mode to **Full (Strict)** with Origin Certificate
- Or use **Full** mode if using self-signed certificates

Go to **SSL/TLS** → **Edge Certificates**:
- ✅ Always Use HTTPS: **ON**
- ✅ Automatic HTTPS Rewrites: **ON**
- ✅ Minimum TLS Version: **TLS 1.2**
- ✅ Opportunistic Encryption: **ON**
- ✅ TLS 1.3: **ON**

#### 2. Security Settings

Go to **Security** → **Settings**:
- ✅ Security Level: **Medium** (or High for sensitive apps)
- ✅ Challenge Passage: **30 minutes**
- ✅ Browser Integrity Check: **ON**

#### 3. WAF (Web Application Firewall)

Go to **Security** → **WAF**:

**Create Custom Rules to protect admin endpoints:**

```
Rule 1: Block Admin Access from Outside
- Field: URI Path
- Operator: starts with
- Value: /admin
- Action: Block (unless your IP)

# Or use this expression:
(http.request.uri.path contains "/admin" and not ip.src in {YOUR_OFFICE_IP})
```

**Rate Limiting Rules:**

```
Rule: Rate Limit OTP Requests
- Field: URI Path  
- Operator: contains
- Value: /otp
- Requests: 20 per 1 minute per IP
- Action: Block for 10 minutes
```

#### 4. Bot Protection (Free Tier)

Go to **Security** → **Bots**:
- ✅ Bot Fight Mode: **ON**
- This blocks obvious bad bots automatically

#### 5. Firewall Rules (Recommended)

Go to **Security** → **WAF** → **Custom Rules**:

**Rule 1: Block Bad Countries** (Optional)
```
Expression: (ip.geoip.country in {"CN" "RU" "KP"})
Action: Managed Challenge
```

**Rule 2: Protect API Endpoints**
```
Expression: (http.request.uri.path contains "/otp/send" and http.request.method eq "POST")
Action: JS Challenge
```

**Rule 3: Allow Only Telegram IPs for Webhooks** (if using webhooks)
```
Expression: (http.request.uri.path contains "/webhook" and not ip.src in {149.154.160.0/20 91.108.4.0/22})
Action: Block
```

### Cloudflare Caching Rules

Go to **Caching** → **Cache Rules**:

**Rule 1: Cache Static Assets Aggressively**
```
- Match: (http.request.uri.path.extension in {"js" "css" "png" "jpg" "svg" "woff2" "ico"})
- Cache eligibility: Eligible for cache
- Edge TTL: 1 month
- Browser TTL: 1 year
```

**Rule 2: Bypass Cache for API**
```
- Match: (http.request.uri.path contains "/otp" or http.request.uri.path contains "/users" or http.request.uri.path contains "/dashboard" or http.request.uri.path contains "/admin")
- Cache eligibility: Bypass cache
```

### Speed Optimization

Go to **Speed** → **Optimization**:

**Content Optimization:**
- ✅ Auto Minify: JavaScript, CSS, HTML
- ✅ Brotli: **ON**
- ✅ Early Hints: **ON**

**Protocol Optimization:**
- ✅ HTTP/2: **ON** (enabled by default)
- ✅ HTTP/3 (QUIC): **ON**

### Cloudflare Page Rules (Legacy but still useful)

Go to **Rules** → **Page Rules**:

**Rule 1: Force HTTPS**
```
URL: http://*alavo.uz/*
Setting: Always Use HTTPS
```

**Rule 2: Cache Everything for Assets**
```
URL: *alavo.uz/*.js
Settings: 
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

### Network Settings

Go to **Network**:
- ✅ HTTP/3 (with QUIC): **ON**
- ✅ WebSockets: **ON** (if needed for real-time features)
- ✅ Onion Routing: **OFF** (unless you want Tor access)
- ✅ IP Geolocation: **ON**

### Getting Real Client IPs

Cloudflare proxies requests, so your server sees Cloudflare IPs instead of real client IPs. The real IP is passed in the `CF-Connecting-IP` header.

Your nginx config already handles this with `X-Forwarded-For`, but you can also add:

```nginx
# Add to nginx.conf
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
real_ip_header CF-Connecting-IP;
```

### Verify Cloudflare Setup

```bash
# Check if traffic goes through Cloudflare
curl -I https://alavo.uz | grep -i "cf-"

# Should see headers like:
# cf-ray: xxxxx
# cf-cache-status: DYNAMIC
# server: cloudflare

# Check SSL certificate issuer
echo | openssl s_client -connect alavo.uz:443 2>/dev/null | openssl x509 -noout -issuer
# Should show: Cloudflare Inc
```

### Cloudflare Analytics

Monitor your site at **Analytics & Logs** → **Traffic**:
- Unique visitors
- Requests by country
- Bandwidth saved by caching
- Threats blocked
- Cache hit ratio

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DOMAIN` | Yes | Your domain name | `alavo.uz` |
| `POSTGRES_USER` | Yes | Database username | `yalavoch` |
| `POSTGRES_PASSWORD` | Yes | Database password | `$(openssl rand -base64 24)` |
| `POSTGRES_DB` | Yes | Database name | `yalavoch` |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather | `123456:ABC-DEF...` |
| `BOT_USERNAME` | Yes | Bot username without @ | `yalavoch_bot` |
| `JWT_SECRET` | Yes | 64+ char random string | `$(openssl rand -base64 48)` |
| `ADMIN_SECRET` | Yes | Admin API key | `your-secure-admin-key` |

