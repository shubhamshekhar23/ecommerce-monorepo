import { join } from 'path';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SearchGrpcService } from './search-grpc.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SEARCH_GRPC_CLIENT',
        transport: Transport.GRPC,
        options: {
          package: 'search',
          protoPath: join(__dirname, '../../../../../proto/search.proto'),
          url: process.env.SEARCH_GRPC_URL ?? 'localhost:5005',
        },
      },
    ]),
  ],
  providers: [SearchGrpcService],
  exports: [SearchGrpcService],
})
export class SearchGrpcClientModule {}
