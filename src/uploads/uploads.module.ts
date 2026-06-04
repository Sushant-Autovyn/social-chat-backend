import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UploadsController } from './uploads.controller';
import { AuthModule } from '../auth/auth.module';
import { UPLOAD_ROOT } from './multer.config';

@Module({
  imports: [
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_ROOT,
      serveRoot: '/uploads',
      serveStaticOptions: { index: false, fallthrough: true },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
