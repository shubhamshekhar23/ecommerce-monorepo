import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";

interface ProductPayload {
  id: string;
  name: string;
  price: number;
}

interface IndexResult {
  success: boolean;
}

@Controller()
export class SearchGrpcController {
  /*
   - Placeholder — real indexing happens via the Kafka CDC consumer in search.service.ts.
   - gRPC path gives the backend synchronous confirmation; Kafka guarantees delivery + retry.
   */
  @GrpcMethod("SearchService", "IndexProduct")
  indexProduct(_data: ProductPayload): IndexResult {
    return { success: true };
  }
}
