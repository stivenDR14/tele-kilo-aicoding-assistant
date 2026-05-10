import { describe, it, expect } from 'vitest';
import { StatePacker } from '../StatePacker';

describe('StatePacker', () => {
  it('should round-trip a simple payload', () => {
    const payload = { hello: 'world', count: 42 };
    const encoded = StatePacker.encode(payload);
    const decoded = StatePacker.decode(encoded);
    expect(decoded).toEqual(payload);
  });

  it('should handle large payloads', () => {
    const payload = { data: 'a'.repeat(50000) };
    const encoded = StatePacker.encode(payload);
    const decoded = StatePacker.decode(encoded);
    expect(decoded).toEqual(payload);
  });

  it('should handle special characters', () => {
    const payload = { complex: '🚀, 🤖, 🌐', weird: '中文字符' };
    const encoded = StatePacker.encode(payload);
    const decoded = StatePacker.decode(encoded);
    expect(decoded).toEqual(payload);
  });
});
