import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { getDb } from "./db";
import { danmaku, users, ownerStatus } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    // Broadcast updated online count to all clients
    const broadcastOnlineCount = () => {
      const count = io?.engine?.clientsCount ?? 0;
      io?.emit("online:count", { count });
    };
    broadcastOnlineCount();

    // Send recent danmaku on connect
    (async () => {
      const db = await getDb();
      if (db) {
        const recent = await db.select({
          id: danmaku.id,
          content: danmaku.content,
          color: danmaku.color,
          senderName: users.displayName,
          createdAt: danmaku.createdAt,
        })
          .from(danmaku)
          .leftJoin(users, eq(danmaku.userId, users.id))
          .orderBy(desc(danmaku.createdAt))
          .limit(20);
        socket.emit("danmaku:history", recent.reverse());

        // Send current owner status
        const statusRows = await db.select().from(ownerStatus).limit(1);
        if (statusRows.length > 0) {
          socket.emit("status:update", statusRows[0]);
        }
      }
    })();

    socket.on("disconnect", () => {
      // Broadcast updated count after disconnect
      setTimeout(broadcastOnlineCount, 100);
    });
  });

  return io;
}

// Broadcast a new danmaku to all connected clients
export function broadcastDanmaku(data: {
  id: number;
  content: string;
  color: string;
  senderName: string;
  createdAt: Date;
}) {
  if (io) {
    io.emit("danmaku:new", data);
  }
}

// Broadcast owner status change
export function broadcastStatus(data: {
  status: string;
  customMessage?: string | null;
}) {
  if (io) {
    io.emit("status:update", data);
  }
}

// Broadcast gift event (triggers animation on all clients)
export function broadcastGift(data: {
  giftType: string;
  senderName: string;
  message?: string | null;
}) {
  if (io) {
    io.emit("gift:received", data);
  }
}

// Broadcast new announcement
export function broadcastAnnouncement(data: {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
}) {
  if (io) {
    io.emit("announcement:new", data);
  }
}

// Broadcast coin balance update — all clients check if userId matches theirs
export function broadcastCoinsUpdate(data: {
  userId: number;
  newBalance: number;
  amount: number;
  senderName: string;
  recipientName: string;
  note?: string | null;
}) {
  if (io) {
    io.emit("coins:update", data);
  }
}

export function getIO() {
  return io;
}
