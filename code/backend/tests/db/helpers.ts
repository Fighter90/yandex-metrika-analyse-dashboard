import { openDb, type DB } from '../../src/db/connection';
import { migrate } from '../../src/db/migrate';
import type { NewHypothesis } from '@pca/shared';

/** A fresh in-memory database with all migrations applied. */
export function freshDb(): DB {
  const db = openDb(':memory:');
  migrate(db);
  return db;
}

/** A complete, valid hypothesis input; override fields per test. */
export function validHypothesis(overrides: Partial<NewHypothesis> = {}): NewHypothesis {
  return {
    diamondPhase: 'define',
    kind: 'problem',
    subject: 'Слушатель подкаста',
    action: 'не покупает',
    solution: 'билет за 14k+',
    condition: 'нет промежуточного лендинга',
    title: 'Подкаст → низкая конверсия',
    hiddenAssumptions: [
      { category: 'behavior', text: 'холодный лид' },
      { category: 'market', text: 'дорого без ценности' },
      { category: 'tech', text: 'UTM проставлены' },
    ],
    validationMethods: [
      { type: 'quantitative', plan: 'CR podcast vs others' },
      { type: 'synthetic', plan: 'custdev' },
    ],
    impact: 7,
    confidence: 6,
    ease: 9,
    impactRationale: 'r1',
    confidenceRationale: 'r2',
    easeRationale: 'r3',
    greenCriteria: 'CR ниже на 30%',
    yellowCriteria: '10-30%',
    redCriteria: 'нет разницы',
    deadlineDays: 2,
    ...overrides,
  };
}
