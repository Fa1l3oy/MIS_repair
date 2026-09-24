import {
  BadRequestException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  type ArgumentsHost,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { conflict, forbidden, validationError } from './api-error';
import { HttpExceptionFilter } from './http-exception.filter';

function run(exception: unknown) {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new HttpExceptionFilter().catch(exception, host);
  return {
    status: res.statusCode,
    body: res.body as { success: false; error: { code: string; message: string } },
  };
}

describe('HttpExceptionFilter — error envelope + รหัสปิด 7 ค่า', () => {
  // เคส 500 ตั้งใจ log stack ไว้ฝั่งเซิร์ฟเวอร์ — ปิดไว้ไม่ให้รกผลเทส
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('passes ApiError through with its code, Thai message and details', () => {
    expect(run(validationError(['name: ต้องไม่ว่าง']))).toEqual({
      status: 400,
      body: {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: expect.any(String), details: ['name: ต้องไม่ว่าง'] },
      },
    });
    expect(run(forbidden()).status).toBe(403);
    expect(run(conflict('ซ้ำ')).body.error).toEqual({ code: 'CONFLICT', message: 'ซ้ำ' });
  });

  it('maps unknown routes to NOT_FOUND and Nest 400s to BAD_REQUEST', () => {
    expect(run(new NotFoundException('Cannot GET /api/v1/nope')).body.error.code).toBe('NOT_FOUND');
    expect(run(new BadRequestException('Unexpected token } in JSON')).body.error).toEqual({
      code: 'BAD_REQUEST',
      message: 'คำขอไม่ถูกต้อง',
    });
  });

  it('keeps VALIDATION_ERROR on HTTP 400 even for a 413 from the upload limit', () => {
    const result = run(new PayloadTooLargeException('File too large'));
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('turns Prisma unique / foreign-key errors into 409 CONFLICT', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.9.1',
    });
    expect(run(error)).toMatchObject({ status: 409, body: { error: { code: 'CONFLICT' } } });
  });

  it('never leaks stack traces or internal messages on unexpected errors', () => {
    const result = run(new Error('connect ECONNREFUSED 127.0.0.1:5434 at PrismaClient.query'));
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(result.body)).not.toMatch(/ECONNREFUSED|PrismaClient|stack/);
  });
});
