export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isAppointmentOverlapError(err: unknown): boolean {
  const candidate = err as { code?: unknown; constraint?: unknown };
  return candidate.code === '23P01' || candidate.constraint === 'appointments_no_specialist_overlap';
}
