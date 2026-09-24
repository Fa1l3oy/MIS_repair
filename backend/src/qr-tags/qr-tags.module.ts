import { Module } from '@nestjs/common';
import { QrTagsController } from './qr-tags.controller';
import { QrTagsService } from './qr-tags.service';

@Module({
  controllers: [QrTagsController],
  providers: [QrTagsService],
})
export class QrTagsModule {}
