import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, normalize } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponseDto } from './dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadsDir = 'uploads';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(file: any, folder: string): Promise<UploadResponseDto> {
    this.validateFile(file);

    const filename = this.generateFilename(file.originalname);
    const folderPath = this.getFolderPath(folder);
    const filePath = join(folderPath, filename);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    const relativePath = join(folder, filename);
    const url = this.getFileUrl(relativePath);

    this.logger.log(`File uploaded: ${relativePath}`);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      path: relativePath,
    };
  }

  async uploadFiles(files: any[], folder: string): Promise<UploadResponseDto[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(filepath: string): Promise<void> {
    const normalizedPath = normalize(filepath);

    if (normalizedPath.includes('..')) {
      throw new BadRequestException('Invalid file path');
    }

    const fullPath = join(this.uploadsDir, normalizedPath);
    await fs.unlink(fullPath);

    this.logger.log(`File deleted: ${filepath}`);
  }

  private validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const sanitizedName = originalName
      .substring(0, originalName.lastIndexOf('.'))
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

    return `${timestamp}-${uuid}-${sanitizedName}${extension}`;
  }

  private getFileUrl(relativePath: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  private getFolderPath(folder: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return join(this.uploadsDir, folder, year.toString(), month);
  }
}
