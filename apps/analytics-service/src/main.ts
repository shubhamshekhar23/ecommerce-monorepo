import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "warn", "error"],
  });
  const port = process.env.PORT ?? 3007;
  await app.listen(port);
  console.log(`Analytics service running on port ${port}`);
}

bootstrap();
