import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('อักษรย่อบน avatar', () => {
  it('skips Thai titles and takes the first consonant of the first name', () => {
    expect(initialsOf('นายประเสริฐ คงมั่น')).toBe('ป');
    expect(initialsOf('ผศ.ดร.วรรณา ศรีสุข')).toBe('ว');
    expect(initialsOf('นางสาวพิมพ์ชนก ใจดี')).toBe('พ');
    expect(initialsOf('อ.กิตติพงษ์ แสงทอง')).toBe('ก');
    // สระหน้าไม่ใช่อักษรย่อ
    expect(initialsOf('เกียรติศักดิ์ ใจงาม')).toBe('ก');
    expect(initialsOf('นักศึกษาทดสอบ')).toBe('น');
  });

  it('uses the first letters of English names', () => {
    expect(initialsOf('admin')).toBe('AD');
    expect(initialsOf('Somchai Jaidee')).toBe('SJ');
    expect(initialsOf('Dr. Jane Smith')).toBe('JS');
    expect(initialsOf('   ')).toBe('U');
  });
});
