export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  upstreams: {
    backend:      process.env.BACKEND_URL      ?? 'http://localhost:3001',
    auth:         process.env.AUTH_SERVICE_URL  ?? 'http://localhost:3006',
    search:       process.env.SEARCH_SERVICE_URL ?? 'http://localhost:3005',
    notification: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004',
  },
  jwt: {
    publicKey: (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
  },
});
