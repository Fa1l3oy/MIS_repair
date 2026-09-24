/**
 * ย่อรูปจากกล้องมือถือก่อนอัปโหลด (มักใหญ่ 3–8 MB) → JPEG ด้านยาวไม่เกิน 1600px
 * ถ้าเบราว์เซอร์ถอดรหัสไม่ได้ (เช่น HEIC บางเครื่อง) ส่งไฟล์เดิมไปให้ backend ตรวจและแจ้งผลเอง
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;
const SMALL_ENOUGH = 700 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (
    scale === 1 &&
    file.size <= SMALL_ENOUGH &&
    (file.type === 'image/jpeg' || file.type === 'image/webp')
  ) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
}
