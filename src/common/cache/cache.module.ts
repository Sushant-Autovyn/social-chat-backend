import { Module, Logger } from '@nestjs/common';
import { CacheModule, CacheOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): CacheOptions => {
        const url = config.get<string>('REDIS_URL');
        const ttl = config.get<number>('CACHE_TTL_MS', 60_000);

        if (!url) {
          new Logger('CacheModule').warn(
            'REDIS_URL not set — using in-memory cache',
          );
          return { ttl } as CacheOptions;
        }

        const keyv = createKeyv(url);
        keyv.on('error', () => undefined);
        return { stores: [keyv], ttl } as CacheOptions;
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
