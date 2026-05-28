export default () => ({
  port: parseInt(process.env.PORT ?? '3006', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  },
  jwt: {
    privateKey: (process.env.JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    publicKey: (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
});
