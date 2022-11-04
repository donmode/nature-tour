const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log(err.name, ': ', err.message);
  console.log('Uncaught Exception: 💥 Shutting Down...');
  process.exit(1);
});

const app = require('./app');
// console.log(app.get('env'));
// console.log(process.env);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  //   console.log(`listening on port  ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log('There is a/an ', err.name, ': ', err.message);
  console.log('Unhandled Rejection: 💥 Shutting Down...');
  server.close(() => process.exit(1));
});
