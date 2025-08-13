const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');

// Connect to database
connectDB();

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

module.exports = server;
