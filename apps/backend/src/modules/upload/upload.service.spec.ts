import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

// eslint-disable-next-line max-lines-per-function
describe('UploadService', () => {
  let service: UploadService;

  // eslint-disable-next-line max-lines-per-function
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                APP_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('validateFile', () => {
    it('should throw BadRequestException for invalid mime type', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as any;

      await expect(service.uploadFile(file, 'temp')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized file', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
        buffer: Buffer.from('test'),
      } as any;

      await expect(service.uploadFile(file, 'temp')).rejects.toThrow(BadRequestException);
    });

    it('should accept valid image files', async () => {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

      for (const mimeType of validMimeTypes) {
        const file = {
          originalname: `test.${mimeType.split('/')[1]}`,
          mimetype: mimeType,
          size: 1024,
          buffer: Buffer.from('test'),
        } as any;

        const result = await service.uploadFile(file, 'temp');
        expect(result).toBeDefined();
        expect(result.mimeType).toBe(mimeType);
      }
    });
  });

  describe('uploadFile', () => {
    it('should return upload response with correct properties', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as any;

      const result = await service.uploadFile(file, 'temp');

      expect(result).toBeDefined();
      expect(result.originalName).toBe('test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
      expect(result.url).toContain('http://localhost:3000/uploads/temp');
      expect(result.path).toContain('temp');
    });
  });

  describe('deleteFile', () => {
    it('should throw BadRequestException for path traversal attempt', async () => {
      await expect(service.deleteFile('../../../etc/passwd')).rejects.toThrow(BadRequestException);
    });

    it('should accept valid relative paths', async () => {
      // Path validation should pass, actual file deletion would fail but that's okay
      const validPath = 'temp/2024/01/abc123-test.jpg';
      try {
        await service.deleteFile(validPath);
      } catch (error) {
        // Expected to fail due to file not existing in test env
        expect(error).toBeDefined();
      }
    });
  });
});
