import { Module } from "@nestjs/common";
import { OrderConsumer } from "./consumers/order.consumer";
import { UserConsumer } from "./consumers/user.consumer";
import { ReviewConsumer } from "./consumers/review.consumer";

@Module({
  providers: [OrderConsumer, UserConsumer, ReviewConsumer],
})
export class NotificationModule {}
