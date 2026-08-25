/**
 * Analytics Logger
 * 
 * Environment-aware logging (dev only, silent in production)
 */

import { isDevelopment } from '../constants/analytics.constants';

const PREFIX = '[Analytics]';

export const analyticsLogger = {
  info: (...args: any[]) => {
    if (isDevelopment()) {
      console.log(PREFIX, ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment()) {
      console.warn(PREFIX, ...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment()) {
      console.error(PREFIX, ...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment()) {
      console.debug(PREFIX, ...args);
    }
  },
};
