import { Controller, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto, ConfirmErasureDto } from './dto';
import { CurrentUser, Roles } from '@/common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    type: UserResponseDto,
    description: 'Current user profile',
  })
  async getMe(@CurrentUser() user: RequestUser): Promise<UserResponseDto> {
    return this.usersService.getUserProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    type: UserResponseDto,
    description: 'Updated user profile',
  })
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Delete('me/data')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Schedule account data erasure (GDPR Article 17, 7-day grace period)' })
  @ApiResponse({ status: 202, description: 'Erasure scheduled' })
  async scheduleErasure(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmErasureDto,
  ): Promise<{ scheduledAt: Date }> {
    return this.usersService.scheduleErasure(user.id, dto.password);
  }

  @Delete('me/data/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending data erasure request' })
  @ApiResponse({ status: 204, description: 'Erasure cancelled' })
  async cancelErasure(@CurrentUser() user: RequestUser): Promise<void> {
    return this.usersService.cancelErasure(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    type: UserResponseDto,
    description: 'User details',
  })
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.getUserProfile(id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({
    status: 200,
    isArray: true,
    type: UserResponseDto,
    description: 'List of all users',
  })
  async getAllUsers(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }
}
