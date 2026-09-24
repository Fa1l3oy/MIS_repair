import { HttpException } from '@nestjs/common';

/** รายการปิด 7 ค่า — standards/contracts/error-codes.json */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

/** ข้อผิดพลาดที่ตั้งใจส่งให้ client — message เป็นภาษาไทยที่แสดงบนหน้าจอได้ตรง ๆ */
export class ApiError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: string[],
  ) {
    super({ code, message, details }, HTTP_STATUS[code]);
  }
}

export const notFound = (message = 'ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง') =>
  new ApiError('NOT_FOUND', message);
export const forbidden = (
  message = 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้',
) => new ApiError('FORBIDDEN', message);
export const conflict = (message: string) => new ApiError('CONFLICT', message);
export const unauthorized = (message = 'กรุณาเข้าสู่ระบบผ่าน CSMJU Portal') =>
  new ApiError('UNAUTHORIZED', message);
export const validationError = (details: string[], message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง') =>
  new ApiError('VALIDATION_ERROR', message, details);
