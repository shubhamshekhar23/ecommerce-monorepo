import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { AxiosResponse } from "axios";

interface BffHeaders {
  userId?: string;
  userEmail?: string;
}

@Injectable()
export class BffService {
  private readonly backendUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.backendUrl =
      this.config.get<string>("upstreams.backend") ?? "http://localhost:3001";
  }

  async getProductDetail(
    id: string,
    headers: BffHeaders,
  ): Promise<Record<string, unknown>> {
    const forwardHeaders = this.buildHeaders(headers);

    const [product, reviews, variants] = await Promise.allSettled([
      this.http.axiosRef.get(`${this.backendUrl}/api/v1/products/${id}`, {
        headers: forwardHeaders,
      }),
      this.http.axiosRef.get(
        `${this.backendUrl}/api/v1/reviews/products/${id}`,
        { headers: forwardHeaders },
      ),
      this.http.axiosRef.get(
        `${this.backendUrl}/api/v1/products/${id}/variants`,
        { headers: forwardHeaders },
      ),
    ]);

    return {
      ...(this.fulfilled(product) ?? {}),
      reviews: this.fulfilled(reviews) ?? [],
      variants: this.fulfilled(variants) ?? [],
    };
  }

  private fulfilled(result: PromiseSettledResult<AxiosResponse>): unknown {
    return result.status === "fulfilled" ? result.value.data : null;
  }

  private buildHeaders(headers: BffHeaders): Record<string, string> {
    const out: Record<string, string> = {};
    if (headers.userId) out["x-user-id"] = headers.userId;
    if (headers.userEmail) out["x-user-email"] = headers.userEmail;
    return out;
  }
}
