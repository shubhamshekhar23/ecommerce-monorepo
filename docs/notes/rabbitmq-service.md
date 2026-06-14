## RabbitMQ Exchanges & Events

- `user.events`
  - `user.registered` → Published by auth-service on signup → notification-service sends welcome email.

- `order.events`
  - `order.placed` → Published by backend (via Outbox Pattern) when an order is created → notification-service sends order confirmation email.
  - `order.shipped` → Published by backend when shipping is confirmed → notification-service sends shipping email.
  - `order.cancelled` → Defined but currently not consumed (reserved for future use).

- `product.events`
  - `product.created` → Published by backend when a product is added → search-service indexes it in Elasticsearch.
  - `product.updated` → Published by backend when a product is updated → search-service updates the Elasticsearch index.
  - `product.deleted` → Published by backend when a product is deleted → search-service removes it from the Elasticsearch index.

- RabbitMQ Queues
  - `notification.order` → Consumed by notification-service for order events.
  - `notification.order.dlq` → Dead Letter Queue for failed `notification.order` messages.
  - `search.product` → Consumed by search-service for product events.

- Note
  - `order.placed` is published through the Outbox Pattern, ensuring reliable event publishing from the database to RabbitMQ.
