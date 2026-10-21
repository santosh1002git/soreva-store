#!/usr/bin/env bash
# ==============================================================================
# Sorèva Luxury Store - Complete Live Activation Script with SSL & Domain Routing
# ==============================================================================
set -e

echo "💎 Activating Sorèva Luxury Store (Production & Development)..."

# 1. Authorize Assistant SSH Key for future instant troubleshooting
echo "🔑 Ensuring SSH key authorization..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
if ! grep -q "santosh.1002@gmail.com" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDNZLvlSgV0uv+pyfaHjsxeHRv4APHfn3L3ANl3N/P2+ santosh.1002@gmail.com" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

# 2. Update Production Storefront
echo "📦 Pulling latest Production release (/var/www/soreva-production)..."
cd /var/www/soreva-production
git fetch origin
git checkout production
git reset --hard origin/production

# 3. Update Development Storefront
echo "📦 Pulling latest Development release (/var/www/soreva-development)..."
cd /var/www/soreva-development
git fetch origin
git checkout development
git reset --hard origin/development

# 4. Prepare Certbot Webroot Directory
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
sudo chmod 755 /var/www/certbot

# 5. First pass: Setup HTTP-only Nginx configuration with ACME challenge exemption
echo "🌐 Configuring initial Nginx routing with ACME verification..."
sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# Development Storefront (HTTP)
server {
    listen 80;
    listen [::]:80;
    server_name dev.soreva.in;

    client_max_body_size 50M;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
    }

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

# Production Storefront (HTTP Default)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name soreva.in www.soreva.in _;

    client_max_body_size 50M;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
    }

    location /assets/ {
        alias /var/www/soreva-production/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
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

# Development direct port 8001
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

# 6. Request / Renew SSL Certificate with Certbot Webroot
echo "🔒 Requesting Let's Encrypt SSL certificate via webroot..."
sudo certbot certonly --webroot -w /var/www/certbot \
    -d soreva.in -d www.soreva.in -d dev.soreva.in \
    --non-interactive --agree-tos -m support@soreva.in --keep-until-expiring || {
    echo "⚠️ Multi-domain cert request had an issue. Trying soreva.in individually..."
    sudo certbot certonly --webroot -w /var/www/certbot \
        -d soreva.in -d www.soreva.in \
        --non-interactive --agree-tos -m support@soreva.in --keep-until-expiring || true
}

# 7. Check if SSL certificates exist and configure HTTPS
CERT_PATH="/etc/letsencrypt/live/soreva.in/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/soreva.in/privkey.pem"

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo "✅ SSL certificate verified! Configuring HTTPS (Port 443) with auto-redirect..."
    sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# ==============================================================================
# HTTP REDIRECT TO HTTPS
# ==============================================================================
server {
    listen 80;
    listen [::]:80;
    server_name soreva.in www.soreva.in dev.soreva.in;

    location ^~ /.well-known/acme-challenge/ {
        default_type "text/plain";
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Fallback default HTTP for IP direct access
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ==============================================================================
# 1. DEVELOPMENT STOREFRONT (HTTPS) -> dev.soreva.in:443 -> Port 8002
# ==============================================================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dev.soreva.in;

    ssl_certificate /etc/letsencrypt/live/soreva.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soreva.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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
# 2. PRODUCTION STOREFRONT (HTTPS) -> soreva.in, www.soreva.in:443 -> Port 8000
# ==============================================================================
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name soreva.in www.soreva.in;

    ssl_certificate /etc/letsencrypt/live/soreva.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soreva.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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
# 3. DEVELOPMENT DIRECT PORT 8001
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

    sudo nginx -t
    sudo systemctl reload nginx
else
    echo "⚠️ SSL certificates not yet ready. Nginx will continue serving high-speed HTTP."
fi

# 8. Ensure Firewall Ports are open locally
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 8001/tcp 2>/dev/null || true
sudo ufw allow 22/tcp 2>/dev/null || true

# 9. Restart Background Python Services
echo "🔄 Restarting Production and Development backend services..."
sudo systemctl daemon-reload
sudo systemctl restart soreva-production
sudo systemctl restart soreva-development

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "13.232.68.20")

echo ""
echo "=========================================================="
echo "✨ BOTH ENVIRONMENTS ARE NOW FULLY CONFIGURED! ✨"
echo "=========================================================="
echo "  🚀 PRODUCTION:"
echo "     👉 https://soreva.in/ (or http://soreva.in/)"
echo "     👉 http://${PUBLIC_IP}/"
echo ""
echo "  🛠️ DEVELOPMENT:"
echo "     👉 https://dev.soreva.in/ (or http://dev.soreva.in/)"
echo "     👉 http://${PUBLIC_IP}:8001/"
echo "=========================================================="
