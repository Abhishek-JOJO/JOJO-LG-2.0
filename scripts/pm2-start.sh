#!/bin/bash
set -e

source /etc/jojo.env
source /home/ec2-user/.bashrc || source /etc/profile

APP_DIR="/var/www/jojowebv2"

cd "$APP_DIR"

if [ "$APP_ENV" = "stage" ]; then
    PM2_APP_NAME="Stage-Web-V2"
elif [ "$APP_ENV" = "production" ]; then
    PM2_APP_NAME="Prod-Web-V2"
else
    echo "ERROR: Invalid APP_ENV: $APP_ENV"
    exit 1
fi

echo "========================================="
echo "Starting Application"
echo "========================================="
echo "Environment : $APP_ENV"
echo "PM2 App     : $PM2_APP_NAME"
echo

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    echo "Restarting existing PM2 application..."
    pm2 restart "$PM2_APP_NAME"
else
    echo "Starting new PM2 application..."
    pm2 start npm \
        --name "$PM2_APP_NAME" \
        -- start
fi

echo
echo "Saving PM2 process list..."
pm2 save

echo
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo
echo "Deployment completed successfully."
