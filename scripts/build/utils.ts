import { buildLogger } from './logger';

/**
 * Pad string to specified length
 */
function pad(str: string | number, len: number): string {
  return String(str).padEnd(len);
}

/**
 * Print build information banner
 */
export function printBanner(
  env: string,
  version: string,
  loggerAllowed: boolean,
  consoleAllowed: boolean
): void {
  const line = '─'.repeat(52);
  buildLogger.info(`\n┌${line}┐`);
  buildLogger.info(`│  🚀  Subscription Frontend Build Info${' '.repeat(13)}│`);
  buildLogger.info(`├${line}┤`);
  buildLogger.info(`│  Environment  : ${pad(env.toUpperCase(), 33)}│`);
  buildLogger.info(`│  Version      : ${pad(version, 33)}│`);
  buildLogger.info(`│  Logger       : ${pad(loggerAllowed ? '✅ Enabled' : '❌ Disabled', 33)}│`);
  buildLogger.info(`│  Console      : ${pad(consoleAllowed ? '✅ Enabled' : '❌ Disabled', 33)}│`);
  buildLogger.info(`└${line}┘\n`);
}
