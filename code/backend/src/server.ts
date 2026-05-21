import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config';
import { healthRoutes } from './routes/health';

/** Build the Fastify app without listening — keeps it testable. */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(healthRoutes, { prefix: '/api' });
  return app;
}

async function main(): Promise<void> {
  const app = buildServer();
  try {
    await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
