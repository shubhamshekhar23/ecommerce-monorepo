import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user.interface';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';

@ApiTags('returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a return/refund for a delivered order' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReturnDto) {
    return this.returnsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my return requests' })
  list(@CurrentUser() user: RequestUser) {
    return this.returnsService.listByUser(user.id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a return request (admin only)' })
  approve(@Param('id') id: string) {
    return this.returnsService.approve(id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a return request (admin only)' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.returnsService.reject(id, reason);
  }
}
