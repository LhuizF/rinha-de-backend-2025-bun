import { startServer } from './server';
import { healthService } from './services/HealthService';
import { startWorker } from './worker';
import { chmod } from 'fs/promises';

const socketPath = process.env.SOCKET_PATH || "/tmp/sockets/api.sock";

startServer(socketPath)

chmod(socketPath, 0o777)
  .catch(err => console.error(`Socket permissions Failed: ${err.message}`));
startWorker()
if (socketPath === "/tmp/sockets/api1.sock") {
  healthService.start()
}
