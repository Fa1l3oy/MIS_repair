import { formatRequestCode, requestCodePrefix } from './request-code';

describe('request code RP-<พ.ศ. 2 หลัก><เดือน>-<ลำดับ>', () => {
  it('uses the Buddhist year and month in Bangkok time', () => {
    expect(requestCodePrefix(new Date('2026-09-24T05:00:00Z'))).toBe('RP-6909-');
  });

  it('switches month at midnight Bangkok time, not UTC', () => {
    expect(requestCodePrefix(new Date('2026-09-30T16:59:59Z'))).toBe('RP-6909-');
    expect(requestCodePrefix(new Date('2026-09-30T17:00:00Z'))).toBe('RP-6910-');
    expect(requestCodePrefix(new Date('2026-12-31T17:30:00Z'))).toBe('RP-7001-');
  });

  it('pads the running number to at least 4 digits', () => {
    expect(formatRequestCode('RP-6909-', 7)).toBe('RP-6909-0007');
    expect(formatRequestCode('RP-6909-', 12345)).toBe('RP-6909-12345');
  });
});
