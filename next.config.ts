import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import fs from "fs";
import path from "path";

// Read version from package.json
const pkgPath = path.resolve("./package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || pkg.version || "1.0.0";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || "";

// Ensure public directory exists
const publicDir = path.resolve("./public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
// Write version.json
fs.writeFileSync(
  path.join(publicDir, "version.json"),
  JSON.stringify({ version: APP_VERSION, buildTime: BUILD_TIME }, null, 2),
  "utf8"
);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
  // Output export is required for Tizen TV (.wgt) packages
  output: 'export', 
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.jojoapp.in' },
      { protocol: 'https', hostname: '*.jojoapp.com' },
      { protocol: 'https', hostname: '*.thesupercms.com' },
      { protocol: 'https', hostname: 'thesupercms.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'inc1.devtunnels.ms' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
    ];
  },
  trailingSlash: false, // Remove trailing slashes from URLs
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  experimental: {
    // Enable if using React 19 compiler
    // reactCompiler: true,
  },
  turbopack: {
    root: __dirname, // Pin workspace root to this project directory
  },
  // Suppress React key warnings from Next.js internals during build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  allowedDevOrigins: ['192.168.0.207', '192.168.30.27']
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);