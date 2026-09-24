import { Module } from '@nestjs/common';
import { ImageStorage } from './image-storage';
import { RepairImagesController } from './repair-images.controller';

@Module({
  controllers: [RepairImagesController],
  providers: [ImageStorage],
  exports: [ImageStorage],
})
export class RepairImagesModule {}
