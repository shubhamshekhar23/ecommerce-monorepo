import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { FeatureFlagService } from './feature-flag.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import type { FeatureFlag } from '@prisma/client';

@ApiTags('feature-flags')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags' })
  findAll(): Promise<FeatureFlag[]> {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a feature flag' })
  create(@Body() dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    return this.service.create(dto);
  }

  @Patch(':name')
  @ApiOperation({ summary: 'Update a feature flag (toggle enabled, rollout, description)' })
  async update(
    @Param('name') name: string,
    @Body() dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlag> {
    try {
      return await this.service.update(name, dto);
    } catch {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }
  }

  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag' })
  async remove(@Param('name') name: string): Promise<void> {
    try {
      await this.service.remove(name);
    } catch {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }
  }
}
