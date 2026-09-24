-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ImageKind" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'COMMENT', 'RATED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "core_user_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "core_role" VARCHAR(10) NOT NULL,
    "display_name" VARCHAR(100),
    "phone" VARCHAR(10),
    "work_unit" VARCHAR(100),
    "is_technician" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_tags" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "floor" SMALLINT,
    "location" VARCHAR(150) NOT NULL,
    "equipment" VARCHAR(150),
    "asset_number" VARCHAR(50),
    "building_id" UUID NOT NULL,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "qr_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_requests" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "equipment" VARCHAR(150) NOT NULL,
    "asset_number" VARCHAR(50),
    "description" VARCHAR(2000) NOT NULL,
    "floor" SMALLINT,
    "location" VARCHAR(150) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "rating" SMALLINT,
    "feedback" VARCHAR(500),
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "core_user_id" VARCHAR(64) NOT NULL,
    "assignee_core_user_id" VARCHAR(64),
    "building_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "qr_tag_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_images" (
    "id" UUID NOT NULL,
    "filename" VARCHAR(100) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" "ImageKind" NOT NULL DEFAULT 'BEFORE',
    "repair_request_id" UUID NOT NULL,
    "uploader_core_user_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repair_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_activities" (
    "id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "from_status" "RequestStatus",
    "to_status" "RequestStatus",
    "message" VARCHAR(2000),
    "repair_request_id" UUID NOT NULL,
    "actor_core_user_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "request_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "link" VARCHAR(300),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "core_user_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_core_user_id_key" ON "profiles"("core_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_name_key" ON "buildings"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tags_code_key" ON "qr_tags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "repair_requests_code_key" ON "repair_requests"("code");

-- CreateIndex
CREATE INDEX "repair_requests_status_due_at_idx" ON "repair_requests"("status", "due_at");

-- CreateIndex
CREATE INDEX "repair_requests_core_user_id_created_at_idx" ON "repair_requests"("core_user_id", "created_at");

-- CreateIndex
CREATE INDEX "repair_requests_assignee_core_user_id_status_idx" ON "repair_requests"("assignee_core_user_id", "status");

-- CreateIndex
CREATE INDEX "repair_requests_created_at_idx" ON "repair_requests"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "repair_images_filename_key" ON "repair_images"("filename");

-- CreateIndex
CREATE INDEX "request_activities_repair_request_id_created_at_idx" ON "request_activities"("repair_request_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_core_user_id_is_read_idx" ON "notifications"("core_user_id", "is_read");

-- AddForeignKey
ALTER TABLE "qr_tags" ADD CONSTRAINT "qr_tags_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_tags" ADD CONSTRAINT "qr_tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_core_user_id_fkey" FOREIGN KEY ("core_user_id") REFERENCES "profiles"("core_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_assignee_core_user_id_fkey" FOREIGN KEY ("assignee_core_user_id") REFERENCES "profiles"("core_user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_qr_tag_id_fkey" FOREIGN KEY ("qr_tag_id") REFERENCES "qr_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_images" ADD CONSTRAINT "repair_images_repair_request_id_fkey" FOREIGN KEY ("repair_request_id") REFERENCES "repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_images" ADD CONSTRAINT "repair_images_uploader_core_user_id_fkey" FOREIGN KEY ("uploader_core_user_id") REFERENCES "profiles"("core_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_activities" ADD CONSTRAINT "request_activities_repair_request_id_fkey" FOREIGN KEY ("repair_request_id") REFERENCES "repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_activities" ADD CONSTRAINT "request_activities_actor_core_user_id_fkey" FOREIGN KEY ("actor_core_user_id") REFERENCES "profiles"("core_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_core_user_id_fkey" FOREIGN KEY ("core_user_id") REFERENCES "profiles"("core_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- กฎของข้อมูลที่ Prisma schema บอกไม่ได้ (CHECK constraints)
-- ให้ฐานข้อมูลเป็นด่านสุดท้าย แม้มีสคริปต์หรือเครื่องมืออื่นเขียนข้อมูลเข้ามาตรง ๆ
-- ---------------------------------------------------------------------------

-- AddCheckConstraints: profiles
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_core_user_id_check" CHECK (btrim("core_user_id") <> ''),
  ADD CONSTRAINT "profiles_core_role_check" CHECK ("core_role" IN ('student', 'alumni', 'staff', 'admin')),
  ADD CONSTRAINT "profiles_email_check" CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  ADD CONSTRAINT "profiles_display_name_check" CHECK (char_length(btrim("display_name")) >= 2),
  ADD CONSTRAINT "profiles_phone_check" CHECK ("phone" ~ '^0[0-9]{8,9}$'),
  ADD CONSTRAINT "profiles_work_unit_check" CHECK (char_length(btrim("work_unit")) >= 2);

-- AddCheckConstraints: buildings / categories
ALTER TABLE "buildings"
  ADD CONSTRAINT "buildings_name_check" CHECK (char_length(btrim("name")) >= 2),
  ADD CONSTRAINT "buildings_code_check" CHECK ("code" ~ '^[A-Z0-9-]{1,10}$');

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_name_check" CHECK (char_length(btrim("name")) >= 2);

-- AddCheckConstraints: qr_tags (รหัส 8 ตัว ไม่มี I O 0 1 ที่อ่านสับสน)
ALTER TABLE "qr_tags"
  ADD CONSTRAINT "qr_tags_code_check" CHECK ("code" ~ '^[A-HJ-NP-Z2-9]{8}$'),
  ADD CONSTRAINT "qr_tags_floor_check" CHECK ("floor" BETWEEN -5 AND 99),
  ADD CONSTRAINT "qr_tags_location_check" CHECK (char_length(btrim("location")) >= 2),
  ADD CONSTRAINT "qr_tags_equipment_check" CHECK (char_length(btrim("equipment")) >= 2);

-- AddCheckConstraints: repair_requests
ALTER TABLE "repair_requests"
  ADD CONSTRAINT "repair_requests_code_check" CHECK ("code" ~ '^RP-[0-9]{4}-[0-9]{4,}$'),
  ADD CONSTRAINT "repair_requests_equipment_check" CHECK (char_length(btrim("equipment")) >= 2),
  ADD CONSTRAINT "repair_requests_description_check" CHECK (char_length(btrim("description")) >= 5),
  ADD CONSTRAINT "repair_requests_location_check" CHECK (char_length(btrim("location")) >= 2),
  ADD CONSTRAINT "repair_requests_floor_check" CHECK ("floor" BETWEEN -5 AND 99),
  ADD CONSTRAINT "repair_requests_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "repair_requests_rating_status_check" CHECK ("rating" IS NULL OR "status" = 'COMPLETED'),
  ADD CONSTRAINT "repair_requests_feedback_check" CHECK ("feedback" IS NULL OR "rating" IS NOT NULL),
  ADD CONSTRAINT "repair_requests_due_at_check" CHECK ("due_at" >= "created_at"),
  ADD CONSTRAINT "repair_requests_completed_at_check" CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL)),
  ADD CONSTRAINT "repair_requests_accepted_check" CHECK (
    "status" IN ('PENDING', 'CANCELLED', 'REJECTED') OR ("assignee_core_user_id" IS NOT NULL AND "accepted_at" IS NOT NULL)
  );

-- AddCheckConstraints: repair_images (ขนาดไม่เกิน 8 MB · ชนิดไฟล์ตรงกับที่ backend ตรวจ magic bytes)
ALTER TABLE "repair_images"
  ADD CONSTRAINT "repair_images_size_check" CHECK ("size" BETWEEN 1 AND 8388608),
  ADD CONSTRAINT "repair_images_mime_type_check" CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "repair_images_filename_check" CHECK ("filename" ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');

-- AddCheckConstraints: request_activities / notifications
ALTER TABLE "request_activities"
  ADD CONSTRAINT "request_activities_status_check" CHECK ("type" <> 'STATUS_CHANGED' OR "to_status" IS NOT NULL),
  ADD CONSTRAINT "request_activities_comment_check" CHECK ("type" <> 'COMMENT' OR char_length(btrim("message")) >= 1);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_link_check" CHECK ("link" ~ '^/[^/]');

