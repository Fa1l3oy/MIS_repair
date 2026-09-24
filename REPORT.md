# REPORT — csmju-repair

ระบบแจ้งซ่อมเขียนใหม่ทั้งหมดเป็นระบบย่อยของ CSMJU2030 (ของเดิมเป็น Next.js ที่มีระบบ login ของตัวเอง)
branch `feature/repair/initial-implementation` · standards submodule ตรึงที่ v1.0.0 (`fea19d8`)

## ผลรัน

`./standards/scripts/run-all-checks.sh .` (standards v1.0.0 ที่ตรึงไว้)

```
  ✅ PASS  Security & Stack Scan       check-authorized-deps.sh
  ✅ PASS  API Contract Sync           check-openapi-sync.sh
  ✅ PASS  API Contract Sync           check-api-conventions.sh
  ✅ PASS  Data Dictionary Compliance  check-field-aliases.sh
  ✅ PASS  Data Dictionary Compliance  check-snake-case.sh
  ✅ PASS  Data Dictionary Compliance  check-no-hardcoded-faculty.sh
  ✅ PASS  Data Dictionary Compliance  check-money-fields.sh
  ✅ PASS  UI Token Compliance         check-ui-tokens.sh
  ✅ PASS  Code Quality                check-qa.sh
  ✅ PASS  Exception Validation        check-exceptions.sh
```

สคริปต์ชุดใหม่กว่าใน `csmju2030-standards` (main `5bc9313`, VERSION 1.0.0) รันกับ repo เดียวกัน: `✅ All 18 checks passed.`
(QA-01..04 รัน lint / typecheck / test / build จริงทั้งสองชุด · backend 61 unit + 14 e2e · frontend 19 tests)

`node standards/conformance/run.js`

```
── L3 · SSO — rejected handoffs
  PASS  L3-12      callback with a tampered token → 401
  PASS  L3-13      no session cookie is issued for a rejected token
  PASS  L3-14      callback without a token → 400 or 401
  PASS  L3-15      Core Hub rejects an unregistered callback_url

────────────────────────────────────────────────────────────
RESULT: 63 passed · 0 failed · 0 skipped
✅ CONFORMANT — csmju-repair meets standard v1.0 L3
```

ตรวจเพิ่มเติม: build image ทั้งสองตัวด้วย `docker compose --profile app build` แล้วรันจริง — backend migrate แล้วเริ่มได้,
`GET /api/health` ตอบ `{status:"ok", service:"csmju-repair"}`, frontend render หน้า dashboard ผ่าน backend container ได้

## ไฟล์ที่สร้าง/แก้ไข

- `backend/` — NestJS + Prisma ของระบบนี้ทั้งหมด (ฐานข้อมูล `repair_db` แยกจาก Core Hub)
  - `src/auth/*` — ตรวจ token ของ Core Hub, `/api/v1/me`, `/auth/callback`, role mapping, permission (ดูหัวข้อถัดไป)
  - `src/repair-requests/*` — ใบแจ้งซ่อม: workflow (403 ก่อน 409), SLA, เลขที่ `RP-<ปี พ.ศ.><เดือน>-<ลำดับ>`, รูปก่อน/หลังซ่อม, ประวัติ, ความคิดเห็น, คะแนน · เปลี่ยนสถานะแบบมีเงื่อนไข กันสองคนรับงานเดียวกัน
  - `src/repair-images/*` — เก็บรูปใน `UPLOAD_DIR` ชื่อไฟล์ UUID ตรวจชนิดจาก magic bytes · ส่งไฟล์ผ่าน `GET /api/v1/repair-images/:id/file` หลังตรวจสิทธิ์
  - `src/qr-tags/*`, `src/statistics/*`, `src/notifications/*`, `src/profiles/*`, `src/buildings/*`, `src/categories/*`, `src/health/*`
  - `src/common/*` — envelope, error filter (7 code มาตรฐาน · ข้อความไทย), validation ภาษาไทย, pagination, UUID pipe
  - `prisma/schema.prisma` + `migrations/` — snake_case, UUID, timestamptz, CHECK constraint ทุกกฎที่ schema บอกไม่ได้
  - `prisma/seed.ts` (อาคาร/หมวดหมู่) · `prisma/seed-demo.ts` + `prisma/demo-photos/` (ข้อมูลตัวอย่าง 6 เดือนพร้อมรูป)
  - `openapi.json` (สร้างจากโค้ด, API-01 ตรวจว่าตรง) · `Dockerfile` · tests ใน `src/**/*.spec.ts` และ `test/`
- `frontend/` — Next.js 16 App Router
  - `src/app/*` — ทุก route มี `loading.tsx` / `error.tsx` / `not-found.tsx` · `layout.tsx` ครอบด้วย `CsmjuAppShell` ที่เดียว และ `dynamic = "force-dynamic"`
  - `src/components/*` — ฟอร์มแจ้งซ่อม, รายการ/ตัวกรอง/CSV, ไทม์ไลน์, คิวงาน, กราฟสถิติ, หน้า admin
  - `src/csmju/*` — ตัวแทนชั่วคราวของ template `csmju-subsystem-web` (ชื่อ component เดียวกับมาตรฐาน)
  - `src/theme.config.ts` — ค่าสีจริงที่เดียว (UI-01) · `tailwind.config.ts` ใช้ชื่อ token ตาม ui-design-system.md
  - `src/lib/*` — API client, server fetch ที่ส่งคุกกี้ต่อเป็น Bearer, ชนิดข้อมูลจาก openapi.json, รูปแบบวันที่ไทย, QR encoder · `Dockerfile`
- รากของ repo — `package.json` (scripts รวม), `pnpm-workspace.yaml`, `docker-compose.yml`, `.dockerignore`, `.env.example`,
  `subsystem.yaml` (probes สำหรับ conformance), `README.md`, `REPORT.md`
- ไม่ได้แก้ `standards/`, `.github/workflows/`, `CODEOWNERS`

## ชั้น auth ที่คัดลอกมา

- คัดลอกจาก demo-student-subsystem: ไม่ได้คัดลอก — repo อ้างอิงเข้าถึงไม่ได้ จึงเขียนตามสัญญาโดยตรง
  (`standards/contracts/jwt-contract.json`, `docs/auth-contract.md`, `docs/api-conventions.md`)
  - `backend/src/auth/jwks.service.ts` — JWKS แบบ cache + refresh เมื่อเจอ `kid` ใหม่ (มีช่วงหน่วงกันยิงถี่)
  - `backend/src/auth/core-hub-token.verifier.ts` — RS256 เท่านั้น, `iss` / `aud` / `exp` / `nbf` / `kid`, clock tolerance
  - `backend/src/auth/guards/*`, `decorators/*`, `identity.service.ts` — Authorization header ก่อนคุกกี้ `core_hub_access_token` · 401 ≠ 403
  - `backend/src/auth/sso-callback.controller.ts`, `sso-session.ts` — `/auth/callback` ตั้งคุกกี้ HttpOnly · SameSite=Lax · อายุเท่า token
  - `backend/src/auth/role-mapping.ts`, `permissions.ts`, `me.controller.ts`
- แก้ไข: ไม่มี (ผ่าน conformance L1–L3 ทั้ง 63 ข้อ)

## Role mapping ที่ประกาศ (ต้องตรงกับ default_role_mapping ในทะเบียน)

| core role | subsystem role |
|---|---|
| student | USER |
| staff | USER (ผู้ดูแลแต่งตั้งเป็น `TECHNICIAN` ได้ — Layer 2 ของระบบนี้ เก็บใน `profiles.is_technician`) |
| admin | ADMIN |
| alumni | ไม่รับ → 403 |

สิทธิ์เป็น `<resource>:<action>[:own|:any]` · USER ⊂ TECHNICIAN ⊂ ADMIN (`backend/src/auth/permissions.ts`)

## ข้อสมมติที่ตั้งเอง (เพราะมาตรฐานไม่ได้ระบุ หรือระบุไม่ตรงกัน)

1. **เวอร์ชันของกฎหน้าจอ** — submodule ตรึง v1.0.0 แต่ `ui-design-system.md` ใน checkout ล่าสุด (1.3.0) ปรับให้ตรงกับหน้าเว็บจริงของ
   `csmju-core-hub` (ฟอนต์ Noto Sans Thai + Plus Jakarta Sans ผ่าน `next/font`, palette Material 3) จึงทำตาม 1.3.0 ·
   โค้ดผ่านสคริปต์ตรวจทั้งสองชุด · การเลื่อน pointer ของ submodule เป็นงานของ DevOps (GH-03 จะ flag ถ้าเปลี่ยนใน PR งาน)
2. **Tailwind v3.4 แทน v4** — `@tailwindcss/postcss` ไม่อยู่ใน whitelist · ใช้ชื่อ class/token เดียวกับมาตรฐาน ย้ายเป็น v4 ได้โดยไม่แก้หน้าเว็บ
3. **`src/csmju` แทน template `csmju-subsystem-web` และ `@csmju/core-sdk`** ที่ยังไม่เผยแพร่ — ชื่อ component/สไตล์ตามมาตรฐาน ·
   โลโก้เป็นตัวแทน (เข้าถึง `csmju-core-hub/frontend/public/csmju-logo.png` ไม่ได้)
4. **ข้อขัดกันใน ui-design-system.md ข้อ 16.1.2** — ข้อ 5 (JSON เป็น snake_case) และข้อ 6 (อ่านผู้ใช้จาก header `X-User-Id` ของ gateway)
   ขัดกับ `api-conventions.md` / `auth-contract.md` และ conformance → ทำตามสองเอกสารหลัง (JSON camelCase, ตรวจ JWT เองด้วย JWKS)
5. **endpoint ไฟล์รูป** `GET /api/v1/repair-images/:id/file` และ `GET /api/v1/profiles/:id/avatar` ตอบเป็นไฟล์ภาพ ไม่ใช่ envelope JSON
   (ใช้กับ `<img>` ได้ตรง ๆ) — ข้อยกเว้นเดียว (error ยังเป็น envelope ตามปกติ)
6. **ออกจากระบบ** ไม่มี endpoint ในระบบนี้ — ปุ่มออกจากระบบพาไปที่ Core Hub (`NEXT_PUBLIC_CORE_HUB_LOGOUT_URL` หรือหน้าแรกของ portal)
7. **ข้อมูลติดต่อเก็บในระบบนี้** (`display_name`, `phone`, `work_unit`, รูปโปรไฟล์ `avatar_filename`) เพราะ Core Hub v1.0 ยังไม่มี
   (data-dictionary.md ข้อ 1.3) · รูปโปรไฟล์ครอปเป็นสี่เหลี่ยม 512px ในเบราว์เซอร์ รับเฉพาะ JPG/PNG/WebP ≤ 2 MB (ตรวจ magic bytes)
   ผู้ใช้ที่เข้าสู่ระบบแล้วดูรูปของกันได้ (ใช้ในใบแจ้งซ่อม) · ไม่เก็บรายชื่อคณะ · `email` / `core_role` เป็นสำเนาจาก token ที่ตรวจแล้ว
8. **ช่าง** = บุคลากร (core role `staff`) ที่ผู้ดูแลแต่งตั้ง · ถอดได้เมื่อไม่มีงานค้าง (409)
9. **รูปงานซ่อมเก็บบนดิสก์** (`UPLOAD_DIR`, volume ใน Docker) ไม่ใช่ object storage
10. **QR** — whitelist ไม่มีไลบรารี QR จึงเขียน encoder เอง (byte mode, v1–40, L/M/Q/H) · ทดสอบด้วยตัวถอดรหัสที่เขียนแยก
    (`frontend/src/lib/qr.test.ts`) และตรวจกับ jsQR ระหว่างพัฒนา 160/160
11. **UI-03 (warn)** — `!important` มีเฉพาะใน `prefers-reduced-motion` ซึ่งมาตรฐานอนุญาต (ข้อ 3.6)
12. **ข้อมูลตัวอย่าง** — โปรไฟล์ `demo-*` อีเมลโดเมน `.invalid` เข้าสู่ระบบไม่ได้ · ลบได้ด้วย `--clean` · ฐานข้อมูลนอกเครื่องต้องใส่ `--allow-remote`
13. **ทดสอบกับ Core Hub ตัวจำลอง** ที่ทำตามสัญญาเดียวกัน (RS256 + JWKS ดิบ, SSO authorize/handoff, Subsystem Registry)
    เพราะยังไม่มี Core Hub จริงให้ต่อ
14. **⚠️ เบี่ยงจากสเปค AppShell (ตามคำขอของเจ้าของระบบ 2026-09-25)** — บนจอ md+ sidebar ย่อเป็นแถบไอคอน 72px
    และกางเป็น 256px แบบมาตรฐานเมื่อชี้เมาส์หรือกด Tab เข้าไป (กางทับเนื้อหา ไม่ดันหน้า) · ปุ่ม "ตรึงแถบเมนูไว้"
    กลับเป็น sidebar กางตลอดตามสเปค (จำค่าในคุกกี้ `csmju_sidebar`) · ปุ่มกลับหน้าหลัก/ออกจากระบบยังอยู่ล่างซ้ายตำแหน่งเดิม ·
    มือถือยังเป็น drawer ตามสเปค — ถ้า PL ไม่อนุมัติ ให้ตั้งค่าเริ่มต้นเป็นตรึงไว้ (`initialPinned`) หรือใช้ AppShell จาก template แทน ·
    เมื่อระบบปฏิบัติการตั้ง `prefers-reduced-motion` (เช่น Windows ปิด Animation effects) แถบจะกาง/หุบทันทีตามกฎข้อ 3.6
    และใช้การจางของข้อความ 150ms แทนการเลื่อน · กรอบโลโก้กว้างเต็มแผง ·
    เมนูผู้ใช้บน top bar แสดงแค่ avatar (สเปคให้มีชื่อบทบาทข้าง avatar บน desktop) กดแล้วจึงเห็นชื่อ อีเมล และบทบาท
15. **แยกสถานะ 3 เรื่องด้วยรูปแบบ ไม่ใช่สีอย่างเดียว** (สีและ badge ใช้ของมาตรฐานทั้งหมด) — สถานะงาน = badge มีจุดสี +
    แถบสีซ้ายของแถวรายการ · ความเร่งด่วน = tag ไม่มีจุด + ลูกศรบอกระดับ (สีเฉพาะด่วน/ด่วนมาก) · กำหนดเสร็จ = ข้อความ + ไอคอนนาฬิกา
    (สีเฉพาะใกล้/เกินกำหนด) · กราฟสถิติตามสถานะ/ความเร่งด่วนใช้สีเดียวกับ badge · ตัวนับแท็บ "เกินกำหนด" เป็นสีแดง

## สิ่งที่ยังทำไม่ได้ / เคสที่ยังไม่ผ่าน

- เคสที่ยังไม่ผ่าน: ไม่มี (18/18 checks ทั้งสองชุด · conformance 63/0/0)
- ต้องให้ DevOps / PL ดำเนินการ: สร้าง repo `CSMJU2030/csmju-repair` ใน org แล้ว push · ลงทะเบียนใน Subsystem Registry ของ Core Hub จริง
  (callback `https://<โดเมน>/auth/callback`, role mapping ตามตาราง) · เลื่อน submodule `standards` เป็นเวอร์ชันล่าสุด ·
  เปิดสิทธิ์ template `csmju-subsystem-web` / ไฟล์โลโก้ เพื่อแทนที่ `frontend/src/csmju`
- ยังไม่ได้รัน lighthouse-ci / axe-ci ใน workflow `ui-compliance` (ไม่มีใน CI ของ repo นี้) — ตรวจ keyboard / label / ภาพมือถือด้วยมือแล้ว
- Web push ของระบบเดิมไม่ได้ย้ายมา — มีเฉพาะการแจ้งเตือนในระบบ
