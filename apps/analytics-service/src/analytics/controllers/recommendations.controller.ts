import { Controller, Get, Param } from "@nestjs/common";
import {
  RecommendationsService,
  Recommendation,
} from "../services/recommendations.service";

@Controller("api/recommendations")
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get("products/:id")
  async getProductRecommendations(
    @Param("id") id: string,
  ): Promise<Recommendation[]> {
    return this.recommendations.getTopN(id);
  }
}
