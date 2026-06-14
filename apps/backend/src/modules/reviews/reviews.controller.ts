import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '@/common/decorators';
import { UserRole } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user.interface';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a product review (pending moderation)' })
  submit(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.submitReview(user.id, dto);
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'List approved reviews and rating for a product' })
  listForProduct(@Param('productId') productId: string) {
    return this.reviewsService.listForProduct(productId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a review — triggers rating aggregate recompute' })
  approve(@Param('id') id: string) {
    return this.reviewsService.approveReview(id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a review' })
  reject(@Param('id') id: string) {
    return this.reviewsService.rejectReview(id);
  }
}
