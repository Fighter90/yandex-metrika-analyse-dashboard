import type { FastifyInstance } from 'fastify';
import { config, hasMetrikaToken } from '../config';

/** Liveness + minimal readiness signal. Mounted under the `/api` prefix → `GET /api/health`. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'productcamp-analytics-backend',
    counterId: config.COUNTER_ID,
    metrikaTokenPresent: hasMetrikaToken(),
    timestamp: new Date().toISOString(),
  }));
}
