import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'csmju:isPublic';

/** route ที่ไม่ต้องมี token — ต้องประกาศใน subsystem.yaml → public_endpoints ด้วย */
export const Public = () => SetMetadata(IS_PUBLIC, true);
