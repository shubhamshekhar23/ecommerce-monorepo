import { CategoryResponseDto } from './category-response.dto';

export class CategoryTreeDto extends CategoryResponseDto {
  children: CategoryTreeDto[] = [];
}
