import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('converts basic text to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes Czech diacritics', () => {
    expect(slugify('Žďár nad Sázavou')).toBe('zdar-nad-sazavou');
  });

  it('handles all Czech diacritical characters', () => {
    expect(slugify('áčďéěíňóřšťúůýž')).toBe('acdeeinorstuuyz');
  });

  it('handles uppercase Czech diacritics', () => {
    expect(slugify('ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ')).toBe('acdeeinorstuuyz');
  });

  it('replaces special characters with hyphens', () => {
    expect(slugify('foo@bar!baz')).toBe('foo-bar-baz');
  });

  it('collapses multiple special characters into one hyphen', () => {
    expect(slugify('foo---bar   baz')).toBe('foo-bar-baz');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string for only special characters', () => {
    expect(slugify('!!!@@@###')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Stanice 42')).toBe('stanice-42');
  });

  it('handles mixed content', () => {
    expect(slugify('Řeka Vltava - Praha 2')).toBe('reka-vltava-praha-2');
  });
});
