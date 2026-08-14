import { describe, expect, it } from 'vitest';

import { getConfirmsState, publishWithConfirm } from '../../src/labs/confirms/index.js';

describe('confirms lab before connecting', () => {
  it('publishWithConfirm throws a clear error instead of a null-channel crash', async () => {
    await expect(publishWithConfirm('confirmed', {})).rejects.toThrow(/not connected/);
  });

  it('starts with empty history', () => {
    const state = getConfirmsState();
    expect(state.published).toEqual([]);
    expect(state.returned).toEqual([]);
    expect(state.received).toEqual([]);
    expect(state.boundRoutingKey).toBe('confirmed');
  });
});
