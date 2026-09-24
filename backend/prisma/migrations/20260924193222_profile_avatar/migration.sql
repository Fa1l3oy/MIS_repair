-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "avatar_filename" VARCHAR(100);

-- รูปโปรไฟล์: ชื่อไฟล์รูปแบบเดียวกับรูปงานซ่อม (UUID + นามสกุลที่ backend ตรวจ magic bytes แล้ว)
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_avatar_filename_check" CHECK ("avatar_filename" ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');
