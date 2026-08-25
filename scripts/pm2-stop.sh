#!/bin/bash
set -e

source /etc/jojo.env

if [ "$APP_ENV" = "stage" ]; then
    PM2_APP_NAME="Stage-Web-V2"
elif [ "$APP_ENV" = "production" ]; then
    PM2_APP_NAME="Prod-Web-V2"
else
    echo "ERROR: Invalid APP_ENV: $APP_ENV"
    exit 1
fi

echo "========================================="
echo "Stopping Application"
echo "========================================="
echo "Environment : $APP_ENV"
echo "PM2 App     : $PM2_APP_NAME"
echo

pm2 stop "$PM2_APP_NAME" || true

echo "PM2 stop completed."
