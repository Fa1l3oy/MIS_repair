import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { ApiError, HTTP_STATUS, type ErrorCode } from './api-error';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'VALIDATION_ERROR',
};

const DEFAULT_MESSAGE: Record<ErrorCode, string> = {
  BAD_REQUEST: 'คำขอไม่ถูกต้อง',
  VALIDATION_ERROR: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบผ่าน CSMJU Portal',
  FORBIDDEN: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้',
  NOT_FOUND: 'ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง',
  CONFLICT: 'ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณารีเฟรชและลองใหม่',
  INTERNAL_ERROR: 'ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง',
};

/** ข้อความของ multer (ตอนรับไฟล์แนบ) → ข้อความที่ผู้ใช้เข้าใจ */
const UPLOAD_ERRORS: [RegExp, string][] = [
  [/^File too large/i, 'รูปแต่ละไฟล์ต้องมีขนาดไม่เกิน 8 MB'],
  [/^Too many files/i, 'แนบรูปได้ครั้งละไม่เกิน 5 รูป'],
  [/^Unexpected field/i, 'แนบรูปได้เฉพาะในช่อง photos'],
  [
    /^(Too many fields|Field value too long|Field name too long|Too many parts)/i,
    'ข้อมูลในฟอร์มยาวเกินกำหนด',
  ],
];

type Described = { status: number; code: ErrorCode; message: string; details?: string[] };

/**
 * แปลงทุก exception เป็น { success:false, error:{ code, message, details? } }
 * code มาจากรายการปิด 7 ค่าเท่านั้น และไม่เปิดเผย stack trace / SQL / path ภายใน
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, code, message, details } = this.describe(exception);
    if (res.headersSent) return;
    res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
  }

  private describe(exception: unknown): Described {
    if (exception instanceof ApiError) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025')
        return { status: 404, code: 'NOT_FOUND', message: DEFAULT_MESSAGE.NOT_FOUND };
      if (exception.code === 'P2002')
        return { status: 409, code: 'CONFLICT', message: 'มีข้อมูลนี้อยู่แล้ว' };
      if (exception.code === 'P2003') {
        return { status: 409, code: 'CONFLICT', message: 'ข้อมูลนี้ถูกอ้างอิงอยู่ จึงแก้ไขหรือลบไม่ได้' };
      }
    }
    if (exception instanceof HttpException) {
      const raw = exception.getStatus();
      const upload = UPLOAD_ERRORS.find(([pattern]) => pattern.test(exception.message));
      if (upload) return { status: 400, code: 'VALIDATION_ERROR', message: upload[1] };

      const code = STATUS_TO_CODE[raw] ?? (raw >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
      // ข้อความของ Nest/Express เป็นภาษาอังกฤษภายใน จึงใช้ข้อความมาตรฐานภาษาไทยแทน
      // และใช้ HTTP status ตามตาราง code เสมอ (เช่น 413 → VALIDATION_ERROR ต้องเป็น 400)
      const message =
        raw === HttpStatus.PAYLOAD_TOO_LARGE ? 'ข้อมูลหรือไฟล์มีขนาดใหญ่เกินกำหนด' : DEFAULT_MESSAGE[code];
      return { status: HTTP_STATUS[code], code, message };
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return { status: 500, code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGE.INTERNAL_ERROR };
  }
}
