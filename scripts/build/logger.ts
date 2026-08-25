/**
 * Build Logger
 * Simple console logger for build scripts
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

class BuildLogger {
  private getTimestamp(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  info(message: string): void {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`);
  }

  success(message: string): void {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  }

  warn(message: string): void {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`);
  }

  error(message: string, error?: Error): void {
    console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
    if (error) {
      console.error(`${colors.dim}${error.stack || error.message}${colors.reset}`);
    }
  }

  debug(message: string): void {
    console.log(`${colors.dim}[DEBUG]${colors.reset} ${message}`);
  }

  step(step: number, total: number, message: string): void {
    console.log(`${colors.bright}[${step}/${total}]${colors.reset} ${message}`);
  }
}

export const buildLogger = new BuildLogger();
