import { Module } from '@nestjs/common';
import { OrderConsumer } from './consumers/order.consumer';
import { UserConsumer } from './consumers/user.consumer';

@Module({
  providers: [OrderConsumer, UserConsumer],
})
export class NotificationModule {}
