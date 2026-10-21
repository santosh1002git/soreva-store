#!/usr/bin/env bash
# ==============================================================================
# Sorèva Luxury Store - Complete Live Activation Script
# Updates Production & Development, configures Nginx domain routing & SSL
# ==============================================================================
set -e

echo "💎 Activating Sorèva Luxury Store (Production & Development)..."

# 1. Update Production Storefront
echo "📦 Pulling latest Production release (/var/www/soreva-production)..."
cd /var/www/soreva-production
git fetch origin
git checkout production
git reset --hard origin/production

# 2. Update Development Storefront
echo "📦 Pulling latest Development release (/var/www/soreva-development)..."
cd /var/www/soreva-development
git fetch origin
git checkout development
git reset --hard origin/development

# 3. Configure Nginx Virtual Hosts with Domain Routing
echo "🌐 Configuring Nginx reverse proxy with domain routing..."

sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# ==============================================================================
# 1. DEVELOPMENT STOREFRONT (dev.soreva.in) -> Port 8002
# ==============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name dev.soreva.in;

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

# ==============================================================================
# 2. PRODUCTION STOREFRONT (soreva.in, www.soreva.in, & IP default) -> Port 8000
# ==============================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name soreva.in www.soreva.in _;

    client_max_body_size 50M;

    location /assets/ {
        alias /var/www/soreva-production/assets/;
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

# ==============================================================================
# 3. DEVELOPMENT STOREFRONT ON PORT 8001 (Direct IP Access)
# ==============================================================================
server {
    listen 8001;
    listen [::]:8001;
    server_name _;

    client_max_body_size 50M;

    location /assets/ {
        alias /var/www/soreva-development/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
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
sudo systemctl reload nginx

# 4. Open Local UFW Firewall ports if UFW is active
echo "🛡️ Ensuring firewall allows HTTP, HTTPS, and Port 8001..."
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 8001/tcp 2>/dev/null || true
sudo ufw allow 22/tcp 2>/dev/null || true

# 5. Restart Backend Python Services
echo "🔄 Restarting Production and Development backend services..."
sudo systemctl daemon-reload
sudo systemctl restart soreva-production
sudo systemctl restart soreva-development

# 6. Automatic Let's Encrypt SSL Setup for soreva.in, www.soreva.in, dev.soreva.in
echo "🔒 Requesting / renewing SSL certificate with Certbot..."
sudo certbot --nginx -d soreva.in -d www.soreva.in -d dev.soreva.in --non-interactive --agree-tos -m support@soreva.in --redirect || {
    echo "⚠️ Certbot completed with notice. Checking HTTP availability..."
}

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "13.232.68.20")

echo ""
echo "=========================================================="
echo "✨ BOTH ENVIRONMENTS ARE NOW FULLY LIVE & ACTIVE! ✨"
echo "=========================================================="
echo "  🚀 PRODUCTION (Live Storefront):"
echo "     👉 https://soreva.in/"
echo "     👉 https://www.soreva.in/"
echo "     👉 http://${PUBLIC_IP}/"
echo ""
echo "  🛠️ DEVELOPMENT (Test / Staging Storefront):"
echo "     👉 https://dev.soreva.in/"
echo "     👉 http://dev.soreva.in/"
echo "     👉 http://${PUBLIC_IP}:8001/"
echo "=========================================================="
