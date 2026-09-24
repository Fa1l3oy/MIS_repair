import { dueAtFor, minutesLeft, SLA_HOURS, slaStateOf } from './sla';

const created = new Date('2026-09-24T02:00:00.000Z');
const hours = (n: number) => new Date(created.getTime() + n * 3_600_000);

describe('SLA', () => {
  it('sets the due date from the priority target', () => {
    expect(SLA_HOURS).toEqual({ URGENT: 4, HIGH: 24, MEDIUM: 72, LOW: 168 });
    expect(dueAtFor('HIGH', created).toISOString()).toBe('2026-09-25T02:00:00.000Z');
  });

  const open = { status: 'IN_PROGRESS' as const, createdAt: created, dueAt: hours(24), completedAt: null };

  it('ON_TRACK → AT_RISK (last 25 %) → OVERDUE while the job is open', () => {
    expect(slaStateOf(open, hours(10))).toBe('ON_TRACK');
    expect(slaStateOf(open, hours(19))).toBe('AT_RISK');
    expect(slaStateOf(open, hours(25))).toBe('OVERDUE');
  });

  it('MET / MISSED once completed, CLOSED when cancelled or rejected', () => {
    expect(slaStateOf({ ...open, status: 'COMPLETED', completedAt: hours(23) })).toBe('MET');
    expect(slaStateOf({ ...open, status: 'COMPLETED', completedAt: hours(30) })).toBe('MISSED');
    expect(slaStateOf({ ...open, status: 'CANCELLED' })).toBe('CLOSED');
    expect(slaStateOf({ ...open, status: 'REJECTED' })).toBe('CLOSED');
  });

  it('counts minutes left only for open jobs', () => {
    expect(minutesLeft(open, hours(23))).toBe(60);
    expect(minutesLeft(open, hours(25))).toBe(-60);
    expect(minutesLeft({ ...open, status: 'COMPLETED', completedAt: hours(2) }, hours(3))).toBeNull();
  });
});
