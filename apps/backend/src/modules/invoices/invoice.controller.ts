import { Controller, Get, Post, Param, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';
import { InvoiceService } from './invoice.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('orders/:orderId/invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue PDF invoice generation (non-blocking)' })
  enqueue(@Param('orderId') orderId: string): Promise<void> {
    return this.invoiceService.enqueueGeneration(orderId);
  }

  @Get()
  @ApiOperation({ summary: 'Stream the PDF invoice' })
  stream(
    @Param('orderId') orderId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ): Promise<void> {
    return this.invoiceService.streamInvoice(orderId, user.id, res);
  }
}
