import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { Paginated } from './envelope';

/** ห่อทุก response เป็น { success: true, data[, meta] } — controller ห้ามส่ง object ดิบ */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof StreamableFile) return value; // ไฟล์รูป / CSV ส่งเป็นไฟล์ตรง ๆ
        if (value instanceof Paginated) return { success: true, data: value.items, meta: value.meta };
        return { success: true, data: value ?? null };
      }),
    );
  }
}
