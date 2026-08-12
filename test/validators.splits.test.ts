import { describe, it, expect } from 'vitest';
import { validateSplitSum, validateSplitRange } from '../src/lib/validators/splits';

describe('split validators', () => {
  it('sum valid at 100', () => {
    const r = validateSplitSum([50, 25, 25]);
    expect(r.valid).toBe(true);
    expect(r.sum).toBe(100);
  });

  it('sum invalid not 100', () => {
    const r = validateSplitSum([50, 30]);
    expect(r.valid).toBe(false);
  });

  it('range valid for 0..100', () => {
    expect(validateSplitRange(0).valid).toBe(true);
    expect(validateSplitRange(100).valid).toBe(true);
    expect(validateSplitRange('33.33').valid).toBe(true);
  });

  it('range invalid negatives or >100 or too many decimals', () => {
    expect(validateSplitRange(-1).valid).toBe(false);
    expect(validateSplitRange(101).valid).toBe(false);
    expect(validateSplitRange('33.333').valid).toBe(false);
  });
});
