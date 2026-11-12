const app = require('./app');
const { initDb, pool } = require('./db');

const PORT = process.env.PORT || 4001;

initDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`doctor-service listening on port ${PORT}`);
    });

    // k8s sends SIGTERM before killing the pod
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server');
      server.close(() => pool.end().then(() => process.exit(0)));
    });
  })
  .catch(err => {
    console.error('could not connect to database, exiting', err.message);
    process.exit(1);
  });
