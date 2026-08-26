import {
  AvailabilityRepository,
  type AvailabilityRuleInput,
  type BusyRange,
} from '../../../db/availability-repository.js';
import type { CompanyAvailabilityRuleRow } from '../../../db/entities/company-availability-rule.entity.js';
import type { CompanyTimeBlockRow } from '../../../db/entities/company-time-block.entity.js';
import type { SpecialistAvailabilityRuleRow } from '../../../db/entities/specialist-availability-rule.entity.js';
import type { SpecialistTimeBlockRow } from '../../../db/entities/specialist-time-block.entity.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';

export interface AssertSlotAvailableInput {
  companyId: string;
  serviceId: string;
  specialistProfileId: string;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}

export interface ListAvailableSlotsInput {
  companyId: string;
  serviceId: string;
  specialistProfileId: string;
  from: Date;
  to: Date;
  slotStepMinutes?: number;
  limit?: number;
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

interface TimeWindow {
  startsAt: Date;
  endsAt: Date;
}

const DEFAULT_SLOT_STEP_MINUTES = 15;
const DEFAULT_SLOT_LIMIT = 200;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function parseTimeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function assertRuleTimesOrdered(rules: AvailabilityRuleInput[]): void {
  for (const rule of rules) {
    if (parseTimeToMinutes(rule.startTime) >= parseTimeToMinutes(rule.endTime)) {
      throw new AppError('Availability rule startTime must be before endTime', 400);
    }
  }
}

function assertRangeOrdered(startsAt: Date, endsAt: Date): void {
  if (startsAt >= endsAt) {
    throw new AppError('Time block startsAt must be before endsAt', 400);
  }
}

function getZonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? '');
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday,
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const target = Date.UTC(year, month - 1, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  let candidate = new Date(target);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(candidate, timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const delta = target - represented;
    if (delta === 0) return candidate;
    candidate = new Date(candidate.getTime() + delta);
  }

  return candidate;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function intersectWindows(left: TimeWindow[], right: TimeWindow[]): TimeWindow[] {
  const intersections: TimeWindow[] = [];
  for (const a of left) {
    for (const b of right) {
      const startsAt = maxDate(a.startsAt, b.startsAt);
      const endsAt = minDate(a.endsAt, b.endsAt);
      if (startsAt < endsAt) intersections.push({ startsAt, endsAt });
    }
  }
  return intersections.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export class AvailabilityService {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async assertSlotAvailable(input: AssertSlotAvailableInput): Promise<void> {
    const service = await this.projections.findService(input.serviceId);
    if (!service || service.companyId !== input.companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(input.serviceId, input.specialistProfileId);
    if (!assigned) {
      throw new AppError('Preferred specialist is not assigned to this service', 409);
    }

    const windows = await this.buildAvailabilityWindows({
      companyId: input.companyId,
      serviceId: input.serviceId,
      specialistProfileId: input.specialistProfileId,
      from: input.startAt,
      to: input.endAt,
    });
    const insideAvailability = windows.some(
      (window) => input.startAt >= window.startsAt && input.endAt <= window.endsAt,
    );
    if (!insideAvailability) {
      throw new AppError('Selected slot is outside configured availability', 409);
    }

    const busyRanges = await this.loadBusyRanges(input);
    const overlaps = busyRanges.some((range) => input.startAt < range.endsAt && input.endAt > range.startsAt);
    if (overlaps) {
      throw new AppError('Selected slot is not available', 409);
    }
  }

  async listAvailableSlots(input: ListAvailableSlotsInput): Promise<AvailabilitySlot[]> {
    const service = await this.projections.findService(input.serviceId);
    if (!service || service.companyId !== input.companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(input.serviceId, input.specialistProfileId);
    if (!assigned) {
      throw new AppError('Specialist is not assigned to this service', 409);
    }

    const windows = await this.buildAvailabilityWindows(input);
    const busyRanges = await this.loadBusyRanges({
      companyId: input.companyId,
      serviceId: input.serviceId,
      specialistProfileId: input.specialistProfileId,
      startAt: input.from,
      endAt: input.to,
    });
    const freeWindows = this.subtractBusyRanges(windows, busyRanges);
    return this.splitWindowsIntoSlots(
      freeWindows,
      service.durationMinutes,
      input.slotStepMinutes ?? DEFAULT_SLOT_STEP_MINUTES,
      input.limit ?? DEFAULT_SLOT_LIMIT,
    );
  }

  async findBestAvailableSlot(input: ListAvailableSlotsInput): Promise<AvailabilitySlot | null> {
    return (await this.listAvailableSlots({ ...input, limit: 1 }))[0] ?? null;
  }

  async getCompanyAvailability(companyId: string): Promise<{
    rules: CompanyAvailabilityRuleRow[];
    blocks: CompanyTimeBlockRow[];
  }> {
    const [rules, blocks] = await Promise.all([
      this.availability.listCompanyRules(companyId),
      this.availability.listCompanyBlocksForManagement(companyId),
    ]);
    return { rules, blocks };
  }

  async setCompanyAvailability(
    companyId: string,
    rules: AvailabilityRuleInput[],
  ): Promise<CompanyAvailabilityRuleRow[]> {
    assertRuleTimesOrdered(rules);
    return this.availability.withTransaction((manager) => this.availability.setCompanyRules(manager, companyId, rules));
  }

  async addCompanyTimeBlock(input: {
    companyId: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    createdByUserId: string;
  }): Promise<CompanyTimeBlockRow> {
    assertRangeOrdered(input.startsAt, input.endsAt);
    return this.availability.withTransaction((manager) => this.availability.addCompanyBlock(manager, input));
  }

  async removeCompanyTimeBlock(companyId: string, blockId: string): Promise<void> {
    const removed = await this.availability.withTransaction((manager) =>
      this.availability.removeCompanyBlock(manager, companyId, blockId),
    );
    if (!removed) {
      throw new AppError('Time block not found', 404);
    }
  }

  async getSpecialistAvailability(companyId: string, specialistProfileId: string): Promise<{
    rules: SpecialistAvailabilityRuleRow[];
    blocks: SpecialistTimeBlockRow[];
  }> {
    const [rules, blocks] = await Promise.all([
      this.availability.listSpecialistRules(companyId, specialistProfileId),
      this.availability.listSpecialistBlocksForManagement(companyId, specialistProfileId),
    ]);
    return { rules, blocks };
  }

  async setSpecialistAvailability(
    companyId: string,
    specialistProfileId: string,
    rules: AvailabilityRuleInput[],
  ): Promise<SpecialistAvailabilityRuleRow[]> {
    assertRuleTimesOrdered(rules);
    return this.availability.withTransaction((manager) =>
      this.availability.setSpecialistRules(manager, companyId, specialistProfileId, rules),
    );
  }

  async addSpecialistTimeBlock(input: {
    companyId: string;
    specialistProfileId: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    createdByUserId: string;
  }): Promise<SpecialistTimeBlockRow> {
    assertRangeOrdered(input.startsAt, input.endsAt);
    return this.availability.withTransaction((manager) => this.availability.addSpecialistBlock(manager, input));
  }

  async removeSpecialistTimeBlock(companyId: string, specialistProfileId: string, blockId: string): Promise<void> {
    const removed = await this.availability.withTransaction((manager) =>
      this.availability.removeSpecialistBlock(manager, companyId, specialistProfileId, blockId),
    );
    if (!removed) {
      throw new AppError('Time block not found', 404);
    }
  }

  async buildAvailabilityWindows(input: Omit<ListAvailableSlotsInput, 'slotStepMinutes' | 'limit'>): Promise<TimeWindow[]> {
    if (input.from >= input.to) {
      throw new AppError('Invalid availability range', 400);
    }

    const [companyRules, specialistRules] = await Promise.all([
      this.availability.listCompanyRules(input.companyId),
      this.availability.listSpecialistRules(input.companyId, input.specialistProfileId),
    ]);

    if (companyRules.length === 0 || specialistRules.length === 0) {
      return [];
    }

    return intersectWindows(
      this.rulesToWindows(companyRules, input.from, input.to),
      this.rulesToWindows(specialistRules, input.from, input.to),
    );
  }

  subtractBusyRanges(windows: TimeWindow[], busyRanges: BusyRange[]): TimeWindow[] {
    const sortedBusy = [...busyRanges].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const free: TimeWindow[] = [];

    for (const window of windows) {
      let cursor = window.startsAt;
      for (const busy of sortedBusy) {
        if (busy.endsAt <= cursor || busy.startsAt >= window.endsAt) continue;
        if (busy.startsAt > cursor) {
          free.push({ startsAt: cursor, endsAt: minDate(busy.startsAt, window.endsAt) });
        }
        cursor = maxDate(cursor, busy.endsAt);
        if (cursor >= window.endsAt) break;
      }
      if (cursor < window.endsAt) free.push({ startsAt: cursor, endsAt: window.endsAt });
    }

    return free;
  }

  private async loadBusyRanges(input: AssertSlotAvailableInput): Promise<BusyRange[]> {
    const [companyBlocks, specialistBlocks, appointments] = await Promise.all([
      this.availability.listCompanyBlocks(input.companyId, input.startAt, input.endAt),
      this.availability.listSpecialistBlocks(input.companyId, input.specialistProfileId, input.startAt, input.endAt),
      this.availability.listBusyAppointments(
        input.companyId,
        input.specialistProfileId,
        input.startAt,
        input.endAt,
        input.excludeAppointmentId,
      ),
    ]);

    return [
      ...companyBlocks.map((block) => ({ startsAt: block.startsAt, endsAt: block.endsAt })),
      ...specialistBlocks.map((block) => ({ startsAt: block.startsAt, endsAt: block.endsAt })),
      ...appointments.map((appointment) => ({ startsAt: appointment.startAt, endsAt: appointment.endAt })),
    ];
  }

  private rulesToWindows(
    rules: Array<{ weekday: number; startTime: string; endTime: string; timezone?: string }>,
    from: Date,
    to: Date,
  ): TimeWindow[] {
    const windows: TimeWindow[] = [];
    const visited = new Set<string>();
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() + 2));

    while (day < end) {
      for (const rule of rules) {
        const timezone = rule.timezone ?? 'UTC';
        const local = getZonedParts(day, timezone);
        const key = `${timezone}:${local.year}-${local.month}-${local.day}:${rule.weekday}:${rule.startTime}:${rule.endTime}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (local.weekday !== rule.weekday) continue;

        const startsAt = maxDate(
          zonedDateTimeToUtc(local.year, local.month, local.day, parseTimeToMinutes(rule.startTime), timezone),
          from,
        );
        const endsAt = minDate(
          zonedDateTimeToUtc(local.year, local.month, local.day, parseTimeToMinutes(rule.endTime), timezone),
          to,
        );
        if (startsAt < endsAt) windows.push({ startsAt, endsAt });
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }

    return windows.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  private splitWindowsIntoSlots(
    windows: TimeWindow[],
    durationMinutes: number,
    slotStepMinutes: number,
    limit: number,
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    for (const window of windows) {
      for (
        let startsAt = window.startsAt;
        addMinutes(startsAt, durationMinutes) <= window.endsAt;
        startsAt = addMinutes(startsAt, slotStepMinutes)
      ) {
        const endsAt = addMinutes(startsAt, durationMinutes);
        slots.push({ startAt: startsAt.toISOString(), endAt: endsAt.toISOString() });
        if (slots.length >= limit) return slots;
      }
    }
    return slots;
  }
}
