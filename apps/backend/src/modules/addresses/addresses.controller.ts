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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CurrentUser } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my saved addresses' })
  list(@CurrentUser() user: RequestUser) {
    return this.addressesService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new address' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved address' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.addressesService.remove(user.id, id);
  }
}
