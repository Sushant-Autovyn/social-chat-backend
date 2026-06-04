import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import type { Request } from 'express';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

export const UPLOAD_LIMITS = {
  image: 5 * 1024 * 1024, // 5 MB
  document: 20 * 1024 * 1024, // 20 MB
};

export const IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const DOCUMENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export type UploadKind = 'avatars' | 'chat-images' | 'documents';

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

ensureDir(UPLOAD_ROOT);

function buildStorage(subdir: UploadKind) {
  const dest = join(UPLOAD_ROOT, subdir);
  ensureDir(dest);
  return diskStorage({
    destination: dest,
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  });
}

function buildFileFilter(allowed: string[]) {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `Unsupported file type: ${file.mimetype}`,
        ),
        false,
      );
    }
    cb(null, true);
  };
}

export const avatarMulterOptions = {
  storage: buildStorage('avatars'),
  fileFilter: buildFileFilter(IMAGE_MIME),
  limits: { fileSize: UPLOAD_LIMITS.image },
};

export const chatImageMulterOptions = {
  storage: buildStorage('chat-images'),
  fileFilter: buildFileFilter(IMAGE_MIME),
  limits: { fileSize: UPLOAD_LIMITS.image },
};

export const documentMulterOptions = {
  storage: buildStorage('documents'),
  fileFilter: buildFileFilter(DOCUMENT_MIME),
  limits: { fileSize: UPLOAD_LIMITS.document },
};

export function publicUrlFor(
  kind: UploadKind,
  filename: string,
  baseUrl?: string,
): string {
  const path = `/uploads/${kind}/${filename}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
}
