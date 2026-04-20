"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Pusher from "pusher-js";

type ConnectionState = "initialized" | "connecting" | "connected" | "unavailable" | "failed" | "disconnected";

interface PusherContextType {
  pusher: Pusher | null;
  isConnected: boolean;
  connectionState: ConnectionState;
}

const PusherContext = createContext<PusherContextType>({ 
  pusher: null, 
  isConnected: false,
  connectionState: "initialized"
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("initialized");

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.warn("[PusherProvider] Missing env vars - NEXT_PUBLIC_PUSHER_KEY:", !!pusherKey, "NEXT_PUBLIC_PUSHER_CLUSTER:", !!pusherCluster);
      setConnectionState("failed");
      return;
    }

    console.log("[PusherProvider] Initializing Pusher client with cluster:", pusherCluster);
    const pusherClient = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    // Track all connection state changes
    pusherClient.connection.bind("state_change", (states: { current: ConnectionState; previous: ConnectionState }) => {
      console.log("[PusherProvider] Connection state:", states.previous, "->", states.current);
      setConnectionState(states.current);
      setIsConnected(states.current === "connected");
    });

    // Connection state debugging
    pusherClient.connection.bind("connected", () => {
      console.log("[PusherProvider] Connected to Pusher");
      setIsConnected(true);
      setConnectionState("connected");
    });
    
    pusherClient.connection.bind("disconnected", () => {
      console.log("[PusherProvider] Disconnected from Pusher");
      setIsConnected(false);
      setConnectionState("disconnected");
    });
    
    pusherClient.connection.bind("error", (err: Error) => {
      console.error("[PusherProvider] Connection error:", err);
      setIsConnected(false);
    });

    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  return (
    <PusherContext.Provider value={{ pusher, isConnected, connectionState }}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
}

