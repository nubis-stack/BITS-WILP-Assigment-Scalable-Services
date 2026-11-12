const app = require('./app');

const PORT = process.env.PORT || 4002;

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set, using the default dev secret');
}

const server = app.listen(PORT, () => {
  console.log(`auth-service listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
