import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { validationError } from './api-error';

function flatten(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => `${field}: ${message}`);
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/**
 * body/query ผิด → 400 VALIDATION_ERROR (ไม่ใช่ 422) · details เป็น array ของข้อความ
 * รูปแบบ "<field>: <ข้อความภาษาไทย>" เพื่อให้หน้าจอแสดง error ใต้ช่องที่ผิดได้
 */
export function createValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) => validationError(flatten(errors)),
  });
}
