import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_SETTINGS, loadGraphSettings } from './graph-settings.ts';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
});

describe('loadGraphSettings', () => {
  it('normalizes malformed persisted field types', () => {
    storage.set('vectora-graph-settings-v1', JSON.stringify({ grid: 'yes', axes: 0, labels: false, points: true, snap: null, angleUnit: 'radians' }));
    expect(loadGraphSettings()).toEqual({ ...DEFAULT_GRAPH_SETTINGS, labels: false, points: true, angleUnit: 'radians' });
  });

  it('ignores non-object persisted values', () => {
    storage.set('vectora-graph-settings-v1', JSON.stringify(['bad']));
    expect(loadGraphSettings()).toEqual(DEFAULT_GRAPH_SETTINGS);
  });
});
