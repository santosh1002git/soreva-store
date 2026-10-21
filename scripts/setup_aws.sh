#!/usr/bin/env bash
# ==============================================================================
# Sorèva Luxury Store - AWS Lightsail Dual-Environment Setup Script
# Sets up Production (Port 8000) & Development (Port 8001) with Nginx on Ubuntu
# ==============================================================================
set -e

echo "💎 Setting up Sorèva Luxury Store (Production & Development) on AWS Lightsail..."

# 1. Update OS and install prerequisites
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip git nginx curl ufw unzip certbot python3-certbot-nginx

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
ExecStart=/usr/bin/python3 /var/www/soreva-development/server.py 8001
Restart=always
RestartSec=3
Environment=APP_ENV=development

[Install]
WantedBy=multi-user.target
EOF

# 10. Configure Nginx Reverse Proxy
sudo tee /etc/nginx/sites-available/soreva > /dev/null << 'EOF'
# Production Server (Default HTTP on Port 80)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

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

# Development Server (Accessible on Port 8001)
server {
    listen 8001;
    listen [::]:8001;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8001;
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
