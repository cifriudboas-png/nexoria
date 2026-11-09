import { describe, expect, it } from 'vitest';
import { formatNexos } from '@/lib/nexos';

describe('formatNexos', () => {
  it('shows amounts under 1000 as they are', () => {
    expect(formatNexos(0)).toBe('0');
    expect(formatNexos(999)).toBe('999');
  });

  it('shows 1000 Nexos as 1K', () => {
    expect(formatNexos(1000)).toBe('1K');
  });

  it('uses M, B and T for millions, billions and trillions', () => {
    expect(formatNexos(2_000_000)).toBe('2M');
    expect(formatNexos(3_000_000_000)).toBe('3B');
    expect(formatNexos(4_000_000_000_000)).toBe('4T');
  });

  it('never rounds a balance up', () => {
    expect(formatNexos(999_999)).toBe('999K');
    expect(formatNexos(1_099_999_998, 'en')).toBe('1.09B');
  });

  it('uses a comma in Portuguese and a dot in English', () => {
    expect(formatNexos(1500, 'pt')).toBe('1,5K');
    expect(formatNexos(1500, 'en')).toBe('1.5K');
    expect(formatNexos(12_345, 'en')).toBe('12.3K');
  });
});
