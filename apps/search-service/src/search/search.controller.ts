import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, SearchResult } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResult & { page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const result = await this.searchService.search(query.q ?? '', from, limit);
    return { ...result, page, limit };
  }
}
