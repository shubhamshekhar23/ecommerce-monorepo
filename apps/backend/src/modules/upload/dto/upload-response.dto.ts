import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'abc123-image.jpg' })
  filename!: string;

  @ApiProperty({ example: 'image.jpg' })
  originalName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 51200 })
  size!: number;

  @ApiProperty({ example: 'http://localhost:3000/uploads/products/2024/01/abc123-image.jpg' })
  url!: string;

  @ApiProperty({ example: 'uploads/products/2024/01/abc123-image.jpg' })
  path!: string;
}
