export default () => ({
  port: parseInt(process.env.PORT ?? '3005', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  },
  opensearch: {
    node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200',
  },
});
