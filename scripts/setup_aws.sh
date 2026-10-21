#!/usr/bin/env bash
# ==============================================================================
# Sorèva Luxury Store - AWS Lightsail Dual-Environment Setup Script
# Sets up Production (Port 8000) & Development (Port 8001) with Nginx on Ubuntu
# ==============================================================================
set -e

echo "💎 Setting up Sorèva Luxury Store (Production & Development) on AWS Lightsail..."

# 1. Clear any stale apt locks and disable interactive restart prompts
sudo killall -9 apt apt-get dpkg 2>/dev/null || true
sudo rm -f /var/lib/dpkg/lock* /var/cache/apt/archives/lock 2>/dev/null || true
sudo dpkg --configure -a 2>/dev/null || true
sudo sed -i "s/#\$nrconf{restart} = 'i';/\$nrconf{restart} = 'a';/g" /etc/needrestart/needrestart.conf 2>/dev/null || true
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# 2. Update OS and install prerequisites
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" python3 python3-pip python3-pil git nginx curl ufw unzip certbot python3-certbot-nginx

# 2. Setup Directories
sudo mkdir -p /var/www/soreva-production
sudo mkdir -p /var/www/soreva-development
sudo chown -R $USER:$USER /var/www/soreva-production
sudo chown -R $USER:$USER /var/www/soreva-development

# 3. Setup Git Repository URL (supports private repo via token or public)
if [ -n "$GITHUB_TOKEN" ]; then
    GIT_REMOTE="https://${GITHUB_TOKEN}@github.com/santosh1002git/soreva-store.git"
else
    GIT_REMOTE="https://github.com/santosh1002git/soreva-store.git"
fi

# 4. Clone Production Codebase
echo "📦 Deploying Production environment (branch: production)..."
if [ ! -d "/var/www/soreva-production/.git" ]; then
    git clone -b production "$GIT_REMOTE" /var/www/soreva-production
else
    cd /var/www/soreva-production && git fetch origin && git checkout production && git pull origin production
fi

# 5. Clone Development Codebase
echo "📦 Deploying Development environment (branch: development)..."
if [ ! -d "/var/www/soreva-development/.git" ]; then
    git clone -b development "$GIT_REMOTE" /var/www/soreva-development
else
    cd /var/www/soreva-development && git fetch origin && git checkout development && git pull origin development
fi

# 6. Configure Production .env
cat << 'EOF' > /var/www/soreva-production/.env
APP_ENV=production
PORT=8000
DEBUG=false
EOF

# 7. Configure Development .env
cat << 'EOF' > /var/www/soreva-development/.env
APP_ENV=development
PORT=8001
DEBUG=true
EOF

# 8. Create Systemd Service for Production
sudo tee /etc/systemd/system/soreva-production.service > /dev/null << 'EOF'
[Unit]
Description=Sorèva Luxury Store - Production Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/soreva-production
ExecStart=/usr/bin/python3 /var/www/soreva-production/server.py 8000
Restart=always
RestartSec=3
Environment=APP_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 9. Create Systemd Service for Development
sudo tee /etc/systemd/system/soreva-development.service > /dev/null << 'EOF'
[Unit]
Description=Sorèva Luxury Store - Development Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/soreva-development
ExecStart=/usr/bin/python3 /var/www/soreva-development/server.py 8002
Restart=always
RestartSec=3
Environment=APP_ENV=development

[Install]
WantedBy=multi-user.target
EOF

# 10. Configure Nginx Reverse Proxy & Edge Caching
sudo mkdir -p /var/cache/nginx/soreva
sudo chown -R www-data:www-data /var/cache/nginx/soreva
sudo chmod 755 /var/cache/nginx/soreva

sudo tee /etc/nginx/conf.d/soreva_cache.conf > /dev/null << 'EOF'
proxy_cache_path /var/cache/nginx/soreva levels=1:2 keys_zone=soreva_img_cache:20m max_size=4g inactive=60d use_temp_path=off;
EOF

sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# Production Server (Default HTTP on Port 80)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name soreva.in www.soreva.in _;

    client_max_body_size 50M;

    location /assets/ {
        alias /var/www/soreva-store/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    location /api/img/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache soreva_img_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";
        proxy_cache_valid 200 304 60d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;
        add_header X-Cache-Status $upstream_cache_status;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Development Server (Accessible on Port 8001 or dev.soreva.in)
server {
    listen 8001;
    listen [::]:8001;
    server_name dev.soreva.in _;

    client_max_body_size 50M;

    location /assets/ {
        alias /var/www/soreva-development/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    location /api/img/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache soreva_img_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";
        proxy_cache_valid 200 304 60d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;
        add_header X-Cache-Status $upstream_cache_status;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/soreva /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 11. Enable and Start Systemd Services
sudo systemctl daemon-reload
sudo systemctl enable soreva-production
sudo systemctl restart soreva-production
sudo systemctl enable soreva-development
sudo systemctl restart soreva-development

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "YOUR_SERVER_IP")

echo "=========================================================="
echo "✨ BOTH ENVIRONMENTS ARE NOW LIVE ON AWS LIGHTSAIL! ✨"
echo "  🚀 PRODUCTION (Live Storefront): http://${PUBLIC_IP}/"
echo "  🛠️ DEVELOPMENT (Test / Staging): http://${PUBLIC_IP}:8001/"
echo "=========================================================="
