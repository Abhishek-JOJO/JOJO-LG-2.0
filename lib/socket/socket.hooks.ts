/**
 * Socket Hooks
 * React hooks for subscribing to socket events
 */

import { useEffect, useState } from "react";
import { socketClient } from "./socket.client";

/**
 * Subscribe to socket event
 * Hook only subscribes - does NOT connect socket
 */
export function useSocketEvent(event: string, callback: Function) {
  useEffect(() => {
    socketClient.on(event, callback);
    return () => socketClient.off(event, callback);
  }, [event, callback]);
}

/**
 * Get connection status (using socket events, NOT polling)
 */
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socketClient.isConnected);
  
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);
    
    // Set initial state
    setIsConnected(socketClient.isConnected);
    
    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
    };
  }, []);
  
  return isConnected;
}
