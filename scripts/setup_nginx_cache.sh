#!/bin/bash
# ==============================================================================
# Sorèva Luxury Jewellery - Nginx Edge Caching & Static Acceleration Setup
# Enables microsecond edge caching for product images & direct asset serving
# ==============================================================================

set -e

echo "==> Configuring Nginx High-Performance Edge Cache for Sorèva..."

# 1. Create Nginx Cache Directory with proper permissions
sudo mkdir -p /var/cache/nginx/soreva
sudo chown -R www-data:www-data /var/cache/nginx/soreva
sudo chmod 755 /var/cache/nginx/soreva

# 2. Add Cache Zone Configuration to /etc/nginx/conf.d/
sudo tee /etc/nginx/conf.d/soreva_cache.conf > /dev/null << 'EOF'
# Sorèva High-Speed In-Memory & Disk Edge Cache (20MB index key zone, up to 4GB image cache)
proxy_cache_path /var/cache/nginx/soreva levels=1:2 keys_zone=soreva_img_cache:20m max_size=4g inactive=60d use_temp_path=off;
EOF

# 3. Update /etc/nginx/sites-available/soreva
sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# ==============================================================================
# Production Server (Port 80 - soreva.in)
# ==============================================================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name soreva.in www.soreva.in _;

    client_max_body_size 50M;

    # Direct static asset delivery (Bypass Python completely)
    location /assets/ {
        alias /var/www/soreva-store/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    # High-Performance Edge Image Cache
    location /api/img/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache settings
        proxy_cache soreva_img_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";
        proxy_cache_valid 200 304 60d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;

        # Headers
        add_header X-Cache-Status $upstream_cache_status;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Main Application Proxy
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
# Development Server (Port 8001 - dev.soreva.in)
# ==============================================================================
server {
    listen 8001;
    listen [::]:8001;
    server_name dev.soreva.in _;

    client_max_body_size 50M;

    # Direct static asset delivery (Bypass Python completely)
    location /assets/ {
        alias /var/www/soreva-development/assets/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    # High-Performance Edge Image Cache
    location /api/img/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache settings
        proxy_cache soreva_img_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_accept";
        proxy_cache_valid 200 304 60d;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;

        # Headers
        add_header X-Cache-Status $upstream_cache_status;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Main Application Proxy
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

# 4. Verify and Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✓ Nginx edge caching successfully configured and reloaded!"
