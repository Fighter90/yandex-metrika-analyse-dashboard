import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { MetricsRepo } from './db/repositories/metrics-repo';
import type { HypothesesRepo } from './db/repositories/hypotheses-repo';
import type { DecisionsRepo } from './db/repositories/decisions-repo';
import type { B2bRepo } from './db/repositories/b2b-repo';
import type { SyncRunner } from './routes/sync';
import type { ReportRunner } from './routes/report';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { hypothesesRoutes } from './routes/hypotheses';
import { decisionsRoutes } from './routes/decisions';
import { b2bRoutes } from './routes/b2b';
import { syncRoutes } from './routes/sync';
import { reportRoutes } from './routes/report';

export interface AppDeps {
  readonly metrics: MetricsRepo;
  readonly hypotheses: HypothesesRepo;
  readonly decisions: DecisionsRepo;
  readonly b2b: B2bRepo;
  readonly runSync: SyncRunner;
  readonly report: ReportRunner;
}

/**
 * Build the Fastify app from injected repositories — no IO at construction, so it is
 * fully testable with an in-memory database. Logger defaults to off for quiet tests.
 */
export function buildServer(
  deps: AppDeps,
  logger: FastifyServerOptions['logger'] = false,
): FastifyInstance {
  const app = Fastify({ logger });

  app.register(swagger, {
    openapi: { info: { title: 'ProductCamp Analytics API', version: '0.1.0' } },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(healthRoutes, { prefix: '/api' });
  app.register(metricsRoutes, { prefix: '/api', repo: deps.metrics });
  app.register(hypothesesRoutes, { prefix: '/api', repo: deps.hypotheses });
  app.register(decisionsRoutes, { prefix: '/api', repo: deps.decisions });
  app.register(b2bRoutes, { prefix: '/api', repo: deps.b2b });
  app.register(syncRoutes, { prefix: '/api', runSync: deps.runSync });
  app.register(reportRoutes, { prefix: '/api', runner: deps.report });

  return app;
}
