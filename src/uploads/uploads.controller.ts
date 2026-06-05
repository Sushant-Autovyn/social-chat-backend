import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  avatarMulterOptions,
  chatImageMulterOptions,
  documentMulterOptions,
  publicUrlFor,
  UploadKind,
} from './multer.config';
import { CloudinaryService } from './cloudinary.service';

interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', avatarMulterOptions))
  async uploadAvatar(
    @CurrentUser() _user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<UploadResponse> {
    return this.toResponse(file, 'avatars', req);
  }

  @Post('chat-image')
  @UseInterceptors(FileInterceptor('file', chatImageMulterOptions))
  async uploadChatImage(
    @CurrentUser() _user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<UploadResponse> {
    return this.toResponse(file, 'chat-images', req);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', documentMulterOptions))
  async uploadDocument(
    @CurrentUser() _user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<UploadResponse> {
    return this.toResponse(file, 'documents', req);
  }

  private async toResponse(
    file: Express.Multer.File | undefined,
    kind: UploadKind,
    req: Request,
  ): Promise<UploadResponse> {
    if (!file) throw new BadRequestException('No file uploaded');

    if (this.cloudinary.enabled) {
      const result = await this.cloudinary.uploadBuffer(
        file.buffer,
        kind,
        file.originalname,
      );
      return {
        url: result.secure_url,
        filename: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return {
      url: publicUrlFor(kind, file.filename, baseUrl),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
