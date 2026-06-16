import "./tracing";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { Logger as PinoLogger } from "nestjs-pino";
import type { MicroserviceOptions } from "@nestjs/microservices";
import { Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "search",
      protoPath: join(__dirname, "../../../proto/search.proto"),
      url: "0.0.0.0:5005",
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  app
    .get(PinoLogger)
    .log(`Search service running on port ${port}`, "Bootstrap");
}

bootstrap();
