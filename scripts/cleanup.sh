#!/bin/bash
set -e

APP_DIR="/var/www/jojowebv2"

cd "$APP_DIR"

echo "========================================="
echo "Cleaning Deployment Directory"
echo "========================================="

shopt -s dotglob nullglob

for item in * .*; do
    case "$item" in
        .|..|.env|.env.*|logs|.well-known)
            echo "Keeping $item"
            continue
            ;;
    esac

    echo "Removing $item"
    rm -rf "$item"
done

echo
echo "Cleanup completed successfully."
