import { describe, it, expect } from 'vitest';
import {
  validateISRC,
  validateISWC,
  validateIPI,
  validateUPC,
} from '../src/lib/validators/identifiers';

describe('identifiers validators', () => {
  it('valid ISRC passes', () => {
    const { valid, normalized } = validateISRC('USRC17607839');
    expect(valid).toBe(true);
    expect(normalized).toBe('USRC17607839');
  });

  it('invalid ISRC fails', () => {
    const r = validateISRC('ABC123');
    expect(r.valid).toBe(false);
  });

  it('valid ISWC passes (example calculation)', () => {
    // Example: body 123456789 -> computed check digit 5 -> full T-123.456.789-5
    const r = validateISWC('T-123.456.789-5');
    expect(r.valid).toBe(true);
  });

  it('invalid ISWC fails', () => {
    const r = validateISWC('T-123.456.789-0');
    expect(r.valid).toBe(false);
  });

  it('valid IPI passes (real-format example starting with 00)', () => {
    // IPI Name Number: 11 digits. Using a Luhn-valid example that starts with '00'
    const r = validateIPI('00123456782');
    expect(r.valid).toBe(true);
  });

  it('invalid IPI fails', () => {
    const r = validateIPI('00123456780');
    expect(r.valid).toBe(false);
  });

  it('valid UPC passes (12 digits)', () => {
    // Example: 036000291452 -> check digit 2
    const r = validateUPC('036000291452');
    expect(r.valid).toBe(true);
  });

  it('invalid UPC fails', () => {
    const r = validateUPC('036000291450');
    expect(r.valid).toBe(false);
  });
});
