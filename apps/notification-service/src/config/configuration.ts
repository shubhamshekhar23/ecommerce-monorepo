export default () => ({
  port: parseInt(process.env.PORT ?? '3004', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@ecommerce.com',
  },
  app: {
    url: process.env.APP_URL ?? 'http://localhost:3000',
  },
});
