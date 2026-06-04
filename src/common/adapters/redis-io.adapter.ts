import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<boolean> {
    const config = this.app.get(ConfigService);
    const url = config.get<string>('REDIS_URL');

    if (!url) {
      this.logger.warn(
        'REDIS_URL not set — Socket.IO running in single-instance mode',
      );
      return false;
    }

    try {
      const pubClient = createClient({
        url,
        socket: { reconnectStrategy: false },
      });
      const subClient = pubClient.duplicate();

      pubClient.on('error', () => undefined);
      subClient.on('error', () => undefined);

      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`Socket.IO Redis adapter connected: ${url}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis unavailable (${msg}) — falling back to single-instance Socket.IO`,
      );
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
