import Pusher from "pusher";

// Lazy-load Pusher server to avoid build-time errors when env vars aren't set
let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY) {
    return null;
  }

  if (!pusherServerInstance) {
    pusherServerInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }

  return pusherServerInstance;
}

// Helper to broadcast events to the Verisure dashboard channel
export async function broadcastEvent(event: string, data: unknown) {
  const pusher = getPusherServer();
  if (!pusher) {
    console.warn("[Pusher] Not configured - skipping broadcast");
    return;
  }

  try {
    await pusher.trigger("verisure-dashboard", event, data);
  } catch (error) {
    console.error(`[Pusher] Failed to broadcast ${event}:`, error);
  }
}



