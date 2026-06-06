import { ApiProperty } from '@nestjs/swagger';

export class CartItemProductImageDto {
  @ApiProperty({ example: 'climg123' })
  id!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/abc/800/600' })
  url!: string;

  @ApiProperty({ example: 'Blue Shirt - image 1', nullable: true })
  altText!: string | null;

  @ApiProperty({ example: true })
  isMain!: boolean;
}

export class CartItemProductDto {
  @ApiProperty({ example: 'clprod456' })
  id!: string;

  @ApiProperty({ example: 'Slim Fit Shirt' })
  name!: string;

  @ApiProperty({ example: 'slim-fit-shirt' })
  slug!: string;

  @ApiProperty({ type: [CartItemProductImageDto] })
  images!: CartItemProductImageDto[];
}

export class CartItemVariantTypeDto {
  @ApiProperty({ example: 'clvtype1' })
  id!: string;

  @ApiProperty({ example: 'Size' })
  name!: string;
}

export class CartItemVariantOptionDto {
  @ApiProperty({ example: 'clvopt1' })
  id!: string;

  @ApiProperty({ example: 'M' })
  value!: string;

  @ApiProperty({ type: () => CartItemVariantTypeDto })
  variantType!: CartItemVariantTypeDto;
}

export class CartItemVariantAttributeValueDto {
  @ApiProperty({ example: 'clvar1' })
  variantId!: string;

  @ApiProperty({ example: 'clvopt1' })
  optionId!: string;

  @ApiProperty({ type: () => CartItemVariantOptionDto })
  option!: CartItemVariantOptionDto;
}

export class CartItemVariantDto {
  @ApiProperty({ example: 'clvar1' })
  id!: string;

  @ApiProperty({ example: 'clprod456' })
  productId!: string;

  @ApiProperty({ example: 'ABC123-M-WHITE' })
  sku!: string;

  @ApiProperty({ example: '74.99' })
  price!: string;

  @ApiProperty({ example: 100 })
  stock!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: [CartItemVariantAttributeValueDto] })
  attributeValues!: CartItemVariantAttributeValueDto[];
}

export class CartItemResponseDto {
  @ApiProperty({ example: 'clitem789' })
  id!: string;

  @ApiProperty({ example: 'clprod456' })
  productId!: string;

  @ApiProperty({ example: 'clvar1' })
  variantId!: string;

  @ApiProperty({ type: () => CartItemProductDto })
  product!: CartItemProductDto;

  @ApiProperty({ type: () => CartItemVariantDto })
  variant!: CartItemVariantDto;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 74.99 })
  unitPrice!: number;

  @ApiProperty({ example: 149.98 })
  subtotal!: number;
}

export class CartResponseDto {
  @ApiProperty({ example: 'clcart123' })
  id!: string;

  @ApiProperty({ example: 'cluser456' })
  userId!: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ example: 3 })
  itemCount!: number;

  @ApiProperty({ example: 224.97 })
  totalPrice!: number;

  @ApiProperty({ example: '2026-06-06T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-06T10:05:00.000Z' })
  updatedAt!: Date;
}
