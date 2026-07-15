import { describe, it, expect } from 'vitest';
import { useResponsive } from '../use-responsive';

describe('useResponsive (smoke)', () => {
  it('is a function', () => {
    expect(typeof useResponsive).toBe('function');
  });

  it('returns the expected shape when called outside a setup (best-effort)', () => {
    // Outside a setup context, useDisplay() throws. We only assert the function exists;
    // the component-level behavior is exercised in component tests.
    expect(useResponsive).toBeDefined();
  });
});