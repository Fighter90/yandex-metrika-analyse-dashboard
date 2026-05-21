import { z } from 'zod';

/** A single row of a Stat API report: parallel dimension + metric arrays. */
export const StatDataRowSchema = z.object({
  dimensions: z.array(z.object({ name: z.string().nullable() }).passthrough()),
  metrics: z.array(z.number().nullable()),
});

/** `/stat/v1/data` (and bytime/drilldown) response envelope. */
export const StatDataResponseSchema = z
  .object({
    data: z.array(StatDataRowSchema),
    total_rows: z.number().optional(),
    totals: z.array(z.array(z.number().nullable())).optional(),
    query: z.unknown().optional(),
  })
  .passthrough();
export type StatDataResponse = z.infer<typeof StatDataResponseSchema>;

/** A goal from the Management API. */
export const GoalSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
  })
  .passthrough();

/** `/management/v1/counter/{id}/goals` response. */
export const GoalsResponseSchema = z.object({ goals: z.array(GoalSchema) }).passthrough();
export type GoalsResponse = z.infer<typeof GoalsResponseSchema>;
