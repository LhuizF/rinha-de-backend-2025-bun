import { startServer } from './server';
import { startWorker } from './worker';
import { chmod } from 'fs/promises';

const socketPath = process.env.SOCKET_PATH || "/tmp/sockets/api.sock";

startServer(socketPath)

chmod(socketPath, 0o777)
  .then(() => console.log(`Socket permissions okay`))
  .catch(err => console.error(`Socket permissions Failed: ${err.message}`));
startWorker()
