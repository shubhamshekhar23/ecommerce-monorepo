import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import { CreatePromotionRuleDto } from './dto/create-promotion-rule.dto';
import { UpdatePromotionRuleDto } from './dto/update-promotion-rule.dto';

@ApiTags('admin/promotion-rules')
@Controller('admin/promotion-rules')
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all promotion rules' })
  async findAll() {
    return this.prisma.promotionRule.findMany({ orderBy: { priority: 'desc' } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a promotion rule' })
  async create(@Body() dto: CreatePromotionRuleDto) {
    return this.prisma.promotionRule.create({ data: dto });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a promotion rule' })
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionRuleDto) {
    const rule = await this.prisma.promotionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Promotion rule ${id} not found`);
    return this.prisma.promotionRule.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a promotion rule (sets active=false)' })
  async remove(@Param('id') id: string) {
    const rule = await this.prisma.promotionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Promotion rule ${id} not found`);
    await this.prisma.promotionRule.update({ where: { id }, data: { active: false } });
  }
}
