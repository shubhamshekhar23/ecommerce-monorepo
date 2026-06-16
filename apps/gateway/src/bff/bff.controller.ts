import { Controller, Get, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import { BffService } from "./bff.service";

@Controller("bff")
export class BffController {
  constructor(private readonly bffService: BffService) {}

  @Get("product/:id")
  getProductDetail(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<Record<string, unknown>> {
    return this.bffService.getProductDetail(id, {
      userId: req.headers["x-user-id"] as string | undefined,
      userEmail: req.headers["x-user-email"] as string | undefined,
    });
  }
}
