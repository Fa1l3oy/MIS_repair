import { describe, expect, it } from 'vitest';
import {
  floorLabel,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPhone,
  formatRelative,
  placeText,
} from './format';

describe('รูปแบบวันที่/ตัวเลขภาษาไทย (ui-design-system.md ข้อ 11.3)', () => {
  it('shows Buddhist-era dates in Bangkok time regardless of the device timezone', () => {
    expect(formatDate('2026-08-11T02:30:00Z')).toBe('11 ส.ค. 2569');
    expect(formatDate('2026-08-11T02:30:00Z', 'long')).toBe('11 สิงหาคม 2569');
    // 18:00 UTC = ตี 1 ของวันถัดไปตามเวลาไทย
    expect(formatDate('2026-08-10T18:00:00Z')).toBe('11 ส.ค. 2569');
    expect(formatDateTime('2026-08-11T02:30:00Z')).toBe('11 ส.ค. 2569 09:30 น.');
  });

  it('uses relative time only within 7 days', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(formatRelative('2026-09-24T11:59:30Z', now)).toBe('เมื่อสักครู่');
    expect(formatRelative('2026-09-24T09:00:00Z', now)).toBe('3 ชั่วโมงที่แล้ว');
    expect(formatRelative('2026-09-22T12:00:00Z', now)).toBe('2 วันที่แล้ว');
    expect(formatRelative('2026-09-01T12:00:00Z', now)).toBe('1 ก.ย. 2569');
  });

  it('formats phone numbers, durations and floors', () => {
    expect(formatPhone('0812345678')).toBe('081-234-5678');
    expect(formatPhone('021234567')).toBe('02-123-4567');
    expect(formatDuration(135)).toBe('2 ชม. 15 นาที');
    expect(formatDuration(3 * 1440 + 240)).toBe('3 วัน 4 ชม.');
    expect(floorLabel(0)).toBe('ชั้น G');
    expect(floorLabel(-2)).toBe('ชั้น B2');
    expect(placeText('อาคารวิทยาการคอมพิวเตอร์', 2, 'CS-201')).toBe(
      'อาคารวิทยาการคอมพิวเตอร์ · ชั้น 2 · CS-201',
    );
  });
});
