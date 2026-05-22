import { describe, it, expect } from 'vitest';
import {
  ICE_CONFIG,
  ASSUMPTION_CATEGORIES,
  VALIDATION_METHOD_TYPES,
  TRAFFIC_LIGHT,
  CHANNELS,
  KPI_TARGET_PAID_TICKETS,
} from './constants';

describe('ICE_CONFIG', () => {
  it('uses the product formula (not arithmetic mean)', () => {
    expect(ICE_CONFIG.formula).toBe('product');
  });

  it('scales each factor 1..10', () => {
    expect(ICE_CONFIG.scale).toEqual({ min: 1, max: 10 });
  });

  it('has strictly ordered thresholds inside the 1..1000 product range', () => {
    const { low, medium, high } = ICE_CONFIG.thresholds;
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
    expect(low).toBeGreaterThanOrEqual(1);
    expect(high).toBeLessThanOrEqual(ICE_CONFIG.scale.max ** 3);
  });

  it('requires rationale per factor', () => {
    expect(ICE_CONFIG.requireRationale).toBe(true);
  });
});

describe('methodology vocabulary', () => {
  it('covers behavior/market/tech assumption categories', () => {
    expect([...ASSUMPTION_CATEGORIES]).toEqual(['behavior', 'market', 'tech']);
  });

  it('exposes four validation method types', () => {
    expect(VALIDATION_METHOD_TYPES).toHaveLength(4);
    expect([...VALIDATION_METHOD_TYPES]).toContain('quantitative');
  });

  it('traffic light is exactly green/yellow/red', () => {
    expect([...TRAFFIC_LIGHT]).toEqual(['green', 'yellow', 'red']);
  });
});

describe('domain constants', () => {
  it('lists the seven breakdown channels including podcast', () => {
    expect(CHANNELS).toHaveLength(7);
    expect([...CHANNELS]).toContain('podcast');
  });

  it('pins the paid-tickets KPI target at 300', () => {
    expect(KPI_TARGET_PAID_TICKETS).toBe(300);
  });
});
