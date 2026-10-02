/**
 * อักษรย่อบน avatar — ตัดคำนำหน้าชื่อก่อน (นาย/นางสาว/ผศ.ดร./Mr. ...)
 * ชื่อไทยใช้พยัญชนะตัวแรกตัวเดียว (ข้ามสระหน้า เ แ โ ใ ไ และไม่เอาสระ/วรรณยุกต์ที่ซ้อนอยู่)
 * ชื่ออังกฤษใช้อักษรแรกของชื่อและนามสกุล หรือ 2 ตัวแรกถ้ามีคำเดียว
 */
const THAI_TITLES = /^(?:(?:นางสาว|นาง|นาย|น\.ส\.|ผศ\.|รศ\.|ศ\.|ดร\.|อ\.|อาจารย์|คุณ)\s*)+/;
const LATIN_TITLES = /^(?:(?:mrs|mr|ms|miss|dr|prof|asst\.?\s*prof|assoc\.?\s*prof)\.?\s+)+/i;
const THAI_CONSONANT = /[ก-ฮ]/;

export function initialsOf(name: string) {
  const clean = name.trim().replace(THAI_TITLES, '').replace(LATIN_TITLES, '').trim();
  if (/^[฀-๿]/.test(clean)) return clean.match(THAI_CONSONANT)?.[0] ?? clean.charAt(0);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  return (words[0] ?? '').slice(0, 2).toUpperCase() || 'U';
}
