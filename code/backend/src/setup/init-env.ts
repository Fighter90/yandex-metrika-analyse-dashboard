import { upsertEnvVar } from '../metrika/oauth';

/** Values `./init.sh` collects. Empty/undefined fields are left untouched in `.env`. */
export interface InitValues {
  readonly anthropicKey?: string;
  readonly counterId?: string;
  readonly goalId?: string;
}

/**
 * Apply the init values onto a `.env` file's text, preserving every other line. Pure so the
 * interactive CLI's only job is collecting input + writing the file. Each value is optional —
 * blank answers keep the existing line.
 */
export function applyInitValues(envContent: string, values: InitValues): string {
  let out = envContent;
  if (values.anthropicKey) out = upsertEnvVar(out, 'ANTHROPIC_API_KEY', values.anthropicKey);
  if (values.counterId) out = upsertEnvVar(out, 'COUNTER_ID', values.counterId);
  if (values.goalId) out = upsertEnvVar(out, 'GOAL_ID', values.goalId);
  return out;
}
