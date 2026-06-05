import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import type { UploadKind } from './multer.config';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private _enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('CLOUDINARY_URL');
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (url) {
      cloudinary.config({ secure: true }); // reads CLOUDINARY_URL automatically
      this._enabled = true;
    } else if (cloud && key && secret) {
      cloudinary.config({
        cloud_name: cloud,
        api_key: key,
        api_secret: secret,
        secure: true,
      });
      this._enabled = true;
    }

    if (this._enabled) {
      this.logger.log('Cloudinary enabled — uploads will be stored remotely');
    } else {
      this.logger.warn(
        'CLOUDINARY_URL not set — falling back to local disk uploads (ephemeral on Railway)',
      );
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  uploadBuffer(
    buffer: Buffer,
    kind: UploadKind,
    originalName: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `social-chat/${kind}`,
          resource_type: kind === 'documents' ? 'raw' : 'image',
          public_id: undefined,
          use_filename: false,
          unique_filename: true,
          filename_override: originalName,
        },
        (err, result) => {
          if (err || !result) {
            reject(err ?? new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
