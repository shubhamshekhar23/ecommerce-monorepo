import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto';

const FILE_FILTER = (_: unknown, file: any, cb: Function) => {
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validMimes.includes(file.mimetype)) {
    return cb(new BadRequestException('Invalid file type'), false);
  }
  cb(null, true);
};

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: FILE_FILTER,
    }),
  )
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  async uploadSingle(@UploadedFile() file: any): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadService.uploadFile(file, 'temp');
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: FILE_FILTER,
    }),
  )
  @ApiOperation({ summary: 'Upload multiple product images' })
  @ApiResponse({ status: 201, type: [UploadResponseDto] })
  async uploadProducts(@UploadedFiles() files: any[]): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.uploadService.uploadFiles(files, 'products');
  }

  @Delete(':filepath')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an uploaded file' })
  @ApiResponse({ status: 200 })
  async deleteFile(@Param('filepath') filepath: string): Promise<{ message: string }> {
    await this.uploadService.deleteFile(filepath);
    return { message: 'File deleted successfully' };
  }
}
