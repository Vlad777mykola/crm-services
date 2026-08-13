export class TransientMessageError extends Error {
  readonly category = 'transient' as const;
}

export class PermanentMessageError extends Error {
  readonly category = 'permanent' as const;
}

export class ValidationMessageError extends Error {
  readonly category = 'validation' as const;
}

export function classifyError(error: unknown): 'transient' | 'permanent' | 'validation' {
  if (error instanceof ValidationMessageError) {
    return 'validation';
  }
  if (error instanceof PermanentMessageError) {
    return 'permanent';
  }
  if (error instanceof TransientMessageError) {
    return 'transient';
  }

  const code = (error as { code?: string }).code;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === '57P01' || code === '08006') {
    return 'transient';
  }

  return 'transient';
}
