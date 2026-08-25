/**
 * Socket Client
 * Singleton for Socket.IO connection management
 */

import { io, Socket } from "socket.io-client";
import { encrypt } from "@lib/crypto/encrypt";
import { logger } from "@lib/logger/logger";
import { DEFAULT_HEADER_VALUES } from "@lib/constants/headers";
import { useLocaleStore } from "@store/useLocaleStore";

class SocketClient {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private currentDeviceId: string | null = null;
  private currentSocketUrl: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private emitQueue: Array<{ eventName: string; data: any; enableEncryption: boolean }> = [];
  
  connect(sessionId: string, deviceId: string, socketUrl: string) {
    // Store credentials for reconnect
    this.currentSessionId = sessionId;
    this.currentDeviceId = deviceId;
    this.currentSocketUrl = socketUrl;
    
    if (this.socket?.connected) {
      logger.info('[Socket] Already connected');
      return;
    }
    
    const currentLocale = useLocaleStore.getState().locale;
    this.socket = io(socketUrl, {
      auth: {
        devicetypecode: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
        deviceID: deviceId,
        sessionid: sessionId,
        language: currentLocale === "gu" ? 2 : 1,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    // Handle connect
    this.socket.on('connect', () => {
      logger.info('[Socket] Connected');
      this.flushQueue();
    });
    
    this.socket.on('disconnect', (reason) => {
      logger.warn('[Socket] Disconnected', { reason });
    });
    
    this.socket.on('connect_error', (error) => {
      logger.error('[Socket] Connection error', { error: error.message });
    });
    
    // Listen for responses (optional - for logging/debugging)
    this.socket.on('res', (response) => {
      logger.info('[Socket] Response received', { response });
    });

    // Attach all registered listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback as any);
      });
    });
  }

  private flushQueue() {
    if (this.emitQueue.length === 0) return;
    logger.info('[Socket] Flushing queued requests', { count: this.emitQueue.length });
    const queue = [...this.emitQueue];
    this.emitQueue = [];
    queue.forEach(({ eventName, data, enableEncryption }) => {
      this.emitRequest(eventName, data, enableEncryption);
    });
  }
  
  // Update session and reconnect
  updateSession(sessionId: string) {
    if (sessionId === this.currentSessionId) {
      return; // No change
    }
    
    logger.info('[Socket] Session changed, reconnecting...');
    
    this.currentSessionId = sessionId;
    
    // Disconnect and reconnect with new session
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.currentSocketUrl && this.currentDeviceId) {
      this.connect(sessionId, this.currentDeviceId, this.currentSocketUrl);
    }
  }

  // Update socket authentication language parameter on the fly
  updateLanguage(locale: string) {
    if (this.socket) {
      this.socket.auth = {
        ...this.socket.auth,
        language: locale === "gu" ? 2 : 1,
      };
      logger.info('[Socket] Auth language updated without disconnect', { locale });
    }
  }
  
  /**
   * Emit encrypted request using "req" protocol
   * 
   * @param eventName - Event name (e.g., "select-profile")
   * @param data - Event data
   * @param enableEncryption - Whether to encrypt (default: true)
   */
  emitRequest(eventName: string, data: any, enableEncryption: boolean = true) {
    if (!this.socket?.connected) {
      logger.warn('[Socket] Not connected, queueing request', { eventName });
      this.emitQueue.push({ eventName, data, enableEncryption });
      return;
    }
    
    try {
      // Prepare payload with event name
      const payload = {
        en: eventName,
        ...data,
      };
      
      // Encrypt if enabled
      const encryptedData = enableEncryption 
        ? encrypt(JSON.stringify(payload), true)
        : JSON.stringify(payload);
      
      // Emit using "req" protocol
      this.socket.emit('req', { data: encryptedData });
      
      logger.info('[Socket] Request emitted', { 
        eventName, 
        encrypted: enableEncryption 
      });
    } catch (error) {
      logger.error('[Socket] Failed to emit request', { 
        eventName,
        error: error instanceof Error ? error.message : 'Unknown' 
      });
    }
  }
  
  emit(event: string, data: any, callback?: Function) {
    if (!this.socket?.connected) {
      logger.warn('[Socket] Not connected, cannot emit');
      return;
    }
    
    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback as any);
  }
  
  off(event: string, callback?: Function) {
    if (callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event)!.delete(callback);
      }
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }
  
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentSessionId = null;
    this.currentDeviceId = null;
    this.currentSocketUrl = null;
  }
  
  get isConnected() {
    return this.socket?.connected || false;
  }
  
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

export const socketClient = new SocketClient();
