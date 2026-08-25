#!/usr/bin/env node

/**
 * Interactive build script for subscription-frontend-2.0
 * Usage:
 *   npm run build              → interactive prompts
 *   npm run build:prod         → direct prod build
 *   npm run build:stage        → direct stage build
 *
 *  npm run build:prod --version=1.2.0
 *  npm run build:stage --version=2.0.0
 */

import * as readline from 'readline';
import { loadEnvForBuild, getPackageVersion, updatePackageVersion } from './env';
import { printBanner } from './utils';
import { runBuild } from './builder';

// ─── Get version from package.json ───────────────────────────────────────────
const PKG_VERSION = getPackageVersion();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const directEnv = args.find((a) => a === '--prod' || a === '--stage' || a === '--dev');

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let env: string;
  let version: string;

  if (directEnv) {
    env = directEnv.replace('--', '');

    // Try to extract version from:
    // 1. --version=x.x.x
    // 2. Environment variables (VERSION or APP_VERSION)
    // 3. NPM config flags passed as arguments (e.g., -v1.0.0 -> npm_config_v1.0.0)
    // 4. Positional arguments that contain numbers (e.g. -1.0.0, v1.0.0, 1.0.0)
    let versionArg =
      args.find((a) => a.startsWith('--version='))?.split('=')[1] ||
      process.env.VERSION ||
      process.env.APP_VERSION ||
      process.env.npm_config_version;

    if (!versionArg) {
      // Scan process.env for config variables matching version format (e.g., npm_config_v1.0.0)
      const npmConfigKeys = Object.keys(process.env).filter((k) => k.startsWith("npm_config_"));
      const versionKey = npmConfigKeys.find((k) => {
        const potentialVer = k.replace("npm_config_", "");
        return /[0-9]/.test(potentialVer) && (potentialVer.includes(".") || potentialVer.includes("_"));
      });
      if (versionKey) {
        versionArg = versionKey.replace("npm_config_", "").replace(/^[-v]+/, "");
      }
    }

    if (!versionArg) {
      const otherArg = args.find((a) => {
        if (a === '--prod' || a === '--stage' || a === '--dev') return false;
        return /[0-9]/.test(a);
      });
      if (otherArg) {
        versionArg = otherArg.replace(/^[-v]+/, '');
      }
    }

    version = versionArg || PKG_VERSION;
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // 1. Environment Selection with Default from .env
    const defaultEnv = (process.env.NEXT_PUBLIC_ENV || 'staging').toLowerCase();
    let envInput = (
      await ask(rl, `  Which environment? (prod / stage / dev) [Default: ${defaultEnv}]: `)
    )
      .trim()
      .toLowerCase();

    if (!envInput) {
      env = defaultEnv;
    } else {
      while (!['prod', 'stage', 'dev', 'production', 'staging', 'development'].includes(envInput)) {
        envInput = (await ask(rl, '  Which environment? (prod / stage / dev): ')).trim().toLowerCase();
      }
      // Normalize
      if (envInput === 'production') env = 'prod';
      else if (envInput === 'staging') env = 'stage';
      else if (envInput === 'development') env = 'dev';
      else env = envInput;
    }

    // 2. Version Selection with Default from package.json
    version = (await ask(rl, `  Build version (e.g. 1.2.0) [Default: ${PKG_VERSION}]: `)).trim() || PKG_VERSION;

    rl.close();
  }

  // ── Update package.json & package-lock.json version ─────────────────────────
  updatePackageVersion(version);


  const loggerAllowed = env !== 'prod';
  const consoleAllowed = env !== 'prod';

  // ── Load environment variables for the selected environment ──────────────
  loadEnvForBuild(env);

  // Ensure version starts with 'v' prefix
  if (!version.startsWith('v')) {
    version = 'v' + version;
  }

  printBanner(env, version, loggerAllowed, consoleAllowed);

  // ── Run Build ──────────────────────────────────────────────────────────────
  runBuild(env, version, loggerAllowed, consoleAllowed);
}

main();
