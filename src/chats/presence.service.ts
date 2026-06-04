import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  // userId -> set of active socket IDs (a user may have multiple tabs/devices).
  private readonly userSockets = new Map<number, Set<string>>();

  addConnection(userId: number, socketId: string): boolean {
    let sockets = this.userSockets.get(userId);
    const wasOffline = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(socketId);
    return wasOffline;
  }

  removeConnection(userId: number, socketId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId: number): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getOnlineUsers(): number[] {
    return Array.from(this.userSockets.keys());
  }

  getSocketsForUser(userId: number): string[] {
    return Array.from(this.userSockets.get(userId) ?? []);
  }
}
