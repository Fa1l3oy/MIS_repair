import { Module } from '@nestjs/common';
import { RepairImagesModule } from '../repair-images/repair-images.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [RepairImagesModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
