import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { PrismaClient } from '../../generated/prisma/client';

/** Prisma 7 + driver adapter (PrismaPg) · เชื่อมต่อเมื่อมี query แรก ไม่ต่อฐานข้อมูลตอนบูต */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
