/**
 * Central Socket Connection
 * Manages socket connection lifecycle
 */

import { socketClient } from "./socket.client";
import { getAppConfig } from "@lib/config/app.config";
import { getBrowserUID } from "@lib/utils/deviceId";
import { logger } from "@lib/logger/logger";

export function connectSocket(sessionId: string) {
  // Avoid reconnect if same session is already active
  if (socketClient.isConnected && socketClient.getCurrentSessionId() === sessionId) {
    logger.info('[Socket] Already connected with same session');
    return;
  }
  
  // Disconnect existing socket before reconnecting
  if (socketClient.isConnected) {
    logger.info('[Socket] Disconnecting existing connection before reconnect');
    socketClient.disconnect();
  }
  
  const config = getAppConfig();
  socketClient.connect(sessionId, getBrowserUID(), config.socketUrl);
}

export function disconnectSocket() {
  socketClient.disconnect();
}

export function updateSocketSession(sessionId: string) {
  socketClient.updateSession(sessionId);
}
