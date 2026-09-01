import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_SETTINGS, loadGraphSettings } from './graph-settings.ts';

describe('graph settings', () => {
  it('provides stable safe defaults when storage is unavailable', () => {
    expect(loadGraphSettings()).toEqual(DEFAULT_GRAPH_SETTINGS);
  });
});
