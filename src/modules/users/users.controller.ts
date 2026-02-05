import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UserResponseDto } from './dto';
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
