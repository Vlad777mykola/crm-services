import { describe, expect, it } from 'vitest';

import { isDirectColor, publishDirect } from '../../src/labs/direct/index.js';
import { publishFanout } from '../../src/labs/fanout/index.js';
import { publishHeaders } from '../../src/labs/headers/index.js';
import { publishTopic } from '../../src/labs/topic/index.js';

describe('isDirectColor', () => {
  it('accepts only the three declared bindings', () => {
    expect(isDirectColor('red')).toBe(true);
    expect(isDirectColor('blue')).toBe(true);
    expect(isDirectColor('green')).toBe(true);
    expect(isDirectColor('purple')).toBe(false);
  });
});

describe('routing labs before connecting', () => {
  it('publishDirect throws a clear error instead of a null-channel crash', () => {
    expect(() => publishDirect('red', {})).toThrow(/not connected/);
  });

  it('publishTopic throws a clear error instead of a null-channel crash', () => {
    expect(() => publishTopic('company.created', {})).toThrow(/not connected/);
  });

  it('publishFanout throws a clear error instead of a null-channel crash', () => {
    expect(() => publishFanout({})).toThrow(/not connected/);
  });

  it('publishHeaders throws a clear error instead of a null-channel crash', () => {
    expect(() => publishHeaders({ format: 'pdf' }, {})).toThrow(/not connected/);
  });
});
