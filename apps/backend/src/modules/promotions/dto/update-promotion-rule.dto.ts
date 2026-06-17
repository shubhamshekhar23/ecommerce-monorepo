import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min, Max } from 'class-validator';

export class UpdatePromotionRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  condition?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  conditionDsl?: string;

  @IsObject()
  @IsOptional()
  action?: Record<string, unknown>;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  stackable?: boolean;
}
