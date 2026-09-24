# csmju-repair — ระบบแจ้งซ่อม

ระบบย่อยของโครงการ CSMJU2030 สำหรับแจ้งซ่อมอาคารและอุปกรณ์ ติดตามงานช่าง และดูสถิติ
เข้าสู่ระบบผ่าน **Core Hub** เท่านั้น (SSO) — ระบบนี้ไม่มีหน้า login / สมัครสมาชิก / ออกจากระบบของตัวเอง

มาตรฐานกลางอยู่ใน `standards/` (submodule ของ CSMJU2030/csmju2030-standards · ตรึงที่ v1.0.0)
ผลตรวจล่าสุดและข้อสมมติทั้งหมดอยู่ใน [REPORT.md](REPORT.md)

## ความสามารถ

| ผู้ใช้ | ทำอะไรได้ |
|---|---|
| นักศึกษา / บุคลากร (`USER`) | แจ้งซ่อมพร้อมรูป (ย่อรูปในเครื่องก่อนส่ง) · สแกน QR ที่ห้อง/อุปกรณ์แล้วฟอร์มกรอกสถานที่ให้ · ติดตามสถานะ · คุยกับช่าง · ยกเลิก · ให้คะแนนหลังซ่อมเสร็จ · การแจ้งเตือนในระบบ · ตั้งรูปโปรไฟล์และข้อมูลติดต่อ |
| ช่าง (`TECHNICIAN`) | คิวงาน (รอรับ / งานของฉัน / ใกล้และเกินกำหนด) · รับงาน · เริ่ม / พักรออะไหล่ / ปิดงานพร้อมรูปหลังซ่อม · ปรับความเร่งด่วนหรือหมวดหมู่ · พิมพ์ใบงาน · ส่งออก CSV |
| ผู้ดูแลระบบ (`ADMIN`) | ทุกอย่างของช่าง + มอบหมาย/โอนงาน · แต่งตั้งบุคลากรเป็นช่าง · จัดการอาคาร หมวดหมู่ และสติกเกอร์ QR (พิมพ์เป็นแผ่น) · สถิติ SLA ความพึงพอใจ จุดเสียซ้ำ ภาระงานช่าง |

SLA ตามความเร่งด่วน: ด่วนมาก 4 ชม. · ด่วน 24 ชม. · ปกติ 72 ชม. · ไม่เร่งด่วน 7 วัน
ค้นหาด่วนได้ทุกหน้าด้วย `Ctrl K`

## โครงสร้าง

```
backend/    NestJS 11 + Prisma 7 (PostgreSQL ของระบบนี้เท่านั้น: repair_db)
  src/auth            ตรวจ token ของ Core Hub (RS256 + JWKS) · /api/v1/me · SSO callback · role/permission
  src/repair-requests ใบแจ้งซ่อม: workflow, SLA, รูป, ประวัติ, ความคิดเห็น, คะแนน
  src/qr-tags         สติกเกอร์ QR ของจุดแจ้งซ่อม       src/statistics   สถิติหน้า dashboard
  src/notifications   การแจ้งเตือนในระบบ              src/profiles     ข้อมูลติดต่อ + แต่งตั้งช่าง
  src/buildings, src/categories, src/repair-images, src/health
  prisma/             schema, migrations, seed.ts (อาคาร/หมวดหมู่), seed-demo.ts + demo-photos/
  openapi.json        สร้างจากโค้ด (pnpm --filter backend generate:openapi)
frontend/   Next.js 16 App Router + Tailwind (token ตาม ui-design-system.md)
  src/app             หน้า: / · requests · queue · dashboard · notifications · profile · q/[code] · admin/*
  src/csmju           ตัวแทนชั่วคราวของ template csmju-subsystem-web (AppShell, Modal, …) — ดู README ในโฟลเดอร์
  src/lib             API client (คุกกี้ HttpOnly ผ่าน origin เดียวกัน) · ชนิดข้อมูลจาก openapi.json · วันที่แบบไทย · QR encoder
standards/  มาตรฐานกลาง (ห้ามแก้ใน repo นี้)
```

## เริ่มพัฒนาในเครื่อง

ต้องมี Node.js 22, pnpm 10 (`corepack enable`), Docker และ **Core Hub** ที่รันอยู่ (ของจริงจาก DevOps
หรือตัวจำลองสำหรับพัฒนาที่ออก token ตามสัญญาเดียวกัน) และลงทะเบียนระบบ `csmju-repair` ไว้แล้ว:
`callback_url` = `http://localhost:3002/auth/callback` (ตรงกับ `base_url` + `callback_path` ใน `subsystem.yaml`
ที่ conformance ตรวจ · ผ่าน frontend `http://localhost:3102/auth/callback` ก็ทำงานเหมือนกัน) ·
`default_role_mapping` = `{ student: USER, staff: USER, admin: ADMIN }`

```bash
git clone --recurse-submodules <repo> && cd csmju-repair
cp .env.example .env                        # แก้ CORE_HUB_URL ให้ชี้ Core Hub ที่ใช้
docker compose up -d db                     # PostgreSQL 16 ที่ localhost:5434 (repair_db)
pnpm install
pnpm --filter backend db:migrate            # prisma migrate deploy
pnpm --filter backend db:seed               # อาคาร + หมวดหมู่งานซ่อม
pnpm --filter backend db:seed:demo          # (ไม่บังคับ) ข้อมูลตัวอย่าง 6 เดือนพร้อมรูป
pnpm dev:backend                            # http://localhost:3002
pnpm dev:frontend                           # http://localhost:3102
```

เปิด http://localhost:3102 → ถ้ายังไม่มี session จะพาไปเข้าสู่ระบบที่ Core Hub แล้วกลับมาที่ `/auth/callback`
ซึ่ง backend ตรวจ token แล้วตั้งคุกกี้ `core_hub_access_token` (HttpOnly) ให้เอง

- ผู้ใช้ที่เข้าระบบครั้งแรกจะถูกสร้างโปรไฟล์อัตโนมัติ · แต่งตั้งช่างได้ที่หน้า **ผู้ใช้และช่าง** (เฉพาะบัญชี core role `staff`)
- ข้อมูลตัวอย่าง: คนในข้อมูลเป็นโปรไฟล์ `demo-*` ที่เข้าสู่ระบบไม่ได้ · บัญชีจริงที่เข้าระบบแล้ว (ช่าง/ผู้ดูแล)
  จะมีงานของตัวเองในช่วง 2 เดือนหลัง · ลบทั้งหมดด้วย `pnpm --filter backend db:seed:demo -- --clean` ·
  ฐานข้อมูลที่ไม่ได้อยู่ในเครื่องต้องใส่ `--allow-remote`

## ตรวจก่อนเปิด PR

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm check          # ./standards/scripts/run-all-checks.sh . (ต้องมี jq)
pnpm conformance    # node standards/conformance/run.js — ต้องรัน backend + Core Hub ก่อน (L3)
```

ชื่อ branch `feature/repair/<เรื่อง>` · commit แบบ `<type>(repair): …` · อ่าน `standards/docs/github-workflow.md` ข้อ 1
ห้ามใช้ `git submodule update --remote` ใน PR งาน — การเลื่อนเวอร์ชัน standards ทำผ่าน PR ที่ DevOps อนุมัติเท่านั้น

## รันทั้งระบบด้วย Docker

```bash
docker compose --profile app up -d --build  # db + backend :3002 + frontend :3102
```

- backend รัน `prisma migrate deploy` ก่อนเริ่มทุกครั้ง · รูปงานซ่อมเก็บใน volume `repair_uploads`
- `NEXT_PUBLIC_*` และ `BACKEND_URL` ถูกฝังตอน build ของ frontend (Next.js คำนวณ rewrites ตอน build) —
  เปลี่ยนค่าแล้วต้อง build ใหม่
- production ควรให้ frontend และ backend อยู่โดเมนเดียวกัน (frontend ส่งต่อ `/api/*` และ `/auth/*` ให้ backend)
  แล้วลงทะเบียน `callback_url` เป็น `https://<โดเมน>/auth/callback`

## ตัวแปร environment

คำอธิบายทุกตัวอยู่ใน [.env.example](.env.example) — ที่สำคัญคือ `DATABASE_URL` (ของระบบนี้เท่านั้น),
`CORE_HUB_URL` / `CORE_HUB_JWKS_URL`, `SUBSYSTEM_ID=csmju-repair`, `FRONTEND_URL`, `UPLOAD_DIR`,
`BACKEND_URL` และ `NEXT_PUBLIC_CORE_HUB_URL`
