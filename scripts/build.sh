#!/bin/bash
set -e

source /etc/jojo.env
source /home/ec2-user/.bashrc || source /etc/profile

APP_DIR="/var/www/jojowebv2"

cd "$APP_DIR"

echo "========================================="
echo "Installing Node Packages"
echo "========================================="

npm ci

echo

echo "========================================="
echo "Reading Build Version"
echo "========================================="

if [ ! -f build_version.txt ]; then
    echo "ERROR: build_version.txt not found!"
    exit 1
fi

VERSION=$(cat build_version.txt)

if [ -z "$VERSION" ]; then
    echo "ERROR: Version is empty!"
    exit 1
fi

echo "Build Version : $VERSION"

echo

echo "========================================="
echo "Building Application"
echo "========================================="

if [ "$APP_ENV" = "stage" ]; then
    BUILD_SCRIPT="build:stage"
elif [ "$APP_ENV" = "production" ]; then
    BUILD_SCRIPT="build:prod"
else
    echo "ERROR: Invalid APP_ENV: $APP_ENV"
    exit 1
fi

echo "Environment : $APP_ENV"
echo "NPM Script  : $BUILD_SCRIPT"

# ── Version Update Detection ───────────────────────────────────────────────────
# Export env vars so Next.js bakes them into the bundle at build time.
# NEXT_PUBLIC_APP_VERSION is read at runtime by /api/version route handler.
export NEXT_PUBLIC_APP_VERSION="$VERSION"
export NEXT_PUBLIC_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}"
echo "NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}"

NODE_OPTIONS="--max-old-space-size=4096" \
npm run "$BUILD_SCRIPT" -- --version="$VERSION"

echo
echo "Build completed successfully."