import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';
import { PresenceService } from './presence.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

interface AuthedSocket extends Socket {
  data: {
    userId: number;
    email: string;
  };
}

interface SendMessagePayload {
  chatId: number;
  content: string;
}

interface TypingPayload {
  chatId: number;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new WsException('Missing auth token');

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ?? 'change-me-in-env',
      });

      (client as AuthedSocket).data.userId = payload.sub;
      (client as AuthedSocket).data.email = payload.email;

      const wasOffline = this.presenceService.addConnection(
        payload.sub,
        client.id,
      );

      // Personal room for direct emits.
      client.join(this.userRoom(payload.sub));

      // Auto-join all the user's chat rooms so they receive new messages.
      const chats = await this.chatsService.listChatsForUser(payload.sub);
      for (const chat of chats) {
        client.join(this.chatRoom(chat.id));
      }

      if (wasOffline) {
        client.broadcast.emit('user:online', { userId: payload.sub });
      }

      client.emit('connected', {
        userId: payload.sub,
        onlineUsers: this.presenceService.getOnlineUsers(),
      });

      this.logger.log(`User ${payload.sub} connected (${client.id})`);
    } catch (err) {
      this.logger.warn(`Rejected connection ${client.id}: ${String(err)}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as AuthedSocket).data?.userId;
    if (!userId) return;

    const wentOffline = this.presenceService.removeConnection(
      userId,
      client.id,
    );
    if (wentOffline) {
      client.broadcast.emit('user:offline', { userId });
    }
    this.logger.log(`User ${userId} disconnected (${client.id})`);
  }

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const { userId } = client.data;
    if (!payload?.chatId || !payload.content?.trim()) {
      throw new WsException('Invalid payload');
    }

    const message = await this.chatsService.sendMessage(
      payload.chatId,
      userId,
      payload.content,
    );

    this.server.to(this.chatRoom(payload.chatId)).emit('message:new', message);
    return { ok: true, messageId: message.id };
  }

  @SubscribeMessage('chat:join')
  onJoinChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { chatId: number },
  ) {
    if (!payload?.chatId) throw new WsException('chatId required');
    client.join(this.chatRoom(payload.chatId));
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  onLeaveChat(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { chatId: number },
  ) {
    if (!payload?.chatId) throw new WsException('chatId required');
    client.leave(this.chatRoom(payload.chatId));
    return { ok: true };
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    if (!payload?.chatId) throw new WsException('chatId required');
    client.to(this.chatRoom(payload.chatId)).emit('typing', {
      chatId: payload.chatId,
      userId: client.data.userId,
      isTyping: !!payload.isTyping,
    });
    return { ok: true };
  }

  @SubscribeMessage('presence:check')
  onPresenceCheck(@MessageBody() payload: { userIds: number[] }) {
    const ids = Array.isArray(payload?.userIds) ? payload.userIds : [];
    return ids.map((id) => ({
      userId: id,
      online: this.presenceService.isOnline(id),
    }));
  }

  // ---------------- WebRTC signaling (1:1) ----------------
  @SubscribeMessage('call:invite')
  onCallInvite(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string; kind?: 'audio' | 'video' },
  ) {
    if (!payload?.toUserId || !payload?.callId) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:invite', {
      fromUserId: client.data.userId,
      callId: payload.callId,
      kind: payload.kind ?? 'video',
    });
    return { ok: true };
  }

  @SubscribeMessage('call:accept')
  onCallAccept(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string },
  ) {
    if (!payload?.toUserId || !payload?.callId) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:accept', {
      fromUserId: client.data.userId,
      callId: payload.callId,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  onCallReject(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string; reason?: string },
  ) {
    if (!payload?.toUserId || !payload?.callId) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:reject', {
      fromUserId: client.data.userId,
      callId: payload.callId,
      reason: payload.reason ?? 'declined',
    });
    return { ok: true };
  }

  @SubscribeMessage('call:end')
  onCallEnd(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string },
  ) {
    if (!payload?.toUserId) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:end', {
      fromUserId: client.data.userId,
      callId: payload.callId,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:offer')
  onCallOffer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string; sdp: any },
  ) {
    if (!payload?.toUserId || !payload?.sdp) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:offer', {
      fromUserId: client.data.userId,
      callId: payload.callId,
      sdp: payload.sdp,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:answer')
  onCallAnswer(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string; sdp: any },
  ) {
    if (!payload?.toUserId || !payload?.sdp) throw new WsException('Invalid payload');
    this.server.to(this.userRoom(payload.toUserId)).emit('call:answer', {
      fromUserId: client.data.userId,
      callId: payload.callId,
      sdp: payload.sdp,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:ice')
  onCallIce(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { toUserId: number; callId: string; candidate: any },
  ) {
    if (!payload?.toUserId || !payload?.candidate) return { ok: false };
    this.server.to(this.userRoom(payload.toUserId)).emit('call:ice', {
      fromUserId: client.data.userId,
      callId: payload.callId,
      candidate: payload.candidate,
    });
    return { ok: true };
  }

  emitToUser(userId: number, event: string, payload: unknown): void {
    this.server?.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToChat(chatId: number, event: string, payload: unknown): void {
    this.server?.to(this.chatRoom(chatId)).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const authHeader =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers.authorization as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!authHeader) return null;
    return authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader;
  }

  private userRoom(userId: number): string {
    return `user:${userId}`;
  }

  private chatRoom(chatId: number): string {
    return `chat:${chatId}`;
  }
}
