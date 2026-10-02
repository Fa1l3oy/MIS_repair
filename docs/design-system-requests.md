# คำขอถึงส่วนกลาง (ui-design-system.md ข้อ 17.4) — ระบบแจ้งซ่อม

ระบบนี้ใช้ของกลางจาก template `csmju-subsystem-web` ใน `csmju-core-hub` (branch `feature/frontend`, commit `73ae729`)
ตามข้อ 17.0 โดยไม่แก้ไฟล์ใน `frontend/src/csmju/` และ `frontend/src/app/globals.css` (ยกเว้นส่วนหัวที่ต้องปรับให้เข้ากับ
Tailwind v3 ดูข้อ R13–R14)

เอกสารนี้รวบรวมจุดที่ของกลาง **ยังไม่พอ** ตามรูปแบบของข้อ 17.4: ปัญหาที่เจอ → หน้าจอที่ต้องการ → ทำไมของเดิมไม่พอ → ข้อเสนอ
พร้อมบอกว่าระหว่างรอ ระบบนี้ทำอะไรแทน (local component ชั่วคราว ประกาศไว้ใน `subsystem.yaml` → `ui.local_components`)

> **สถานะ:** ยังไม่ได้ส่ง — ยังไม่เปิด issue และยังไม่ได้เชื่อมกับส่วนกลาง (รอเจ้าของระบบส่งผ่าน PL ตามขั้นตอน)
> โค้ดต้นแบบของ AppShell ที่เคยทำเองอยู่ใน git history ที่ commit `9a939fa` (`frontend/src/csmju/CsmjuAppShell.tsx`)

## ภาพรวม

| # | เรื่อง | ความสำคัญ | ระหว่างรอ ระบบนี้ทำอะไร |
|---|---|---|---|
| R1 | ช่องค้นหา กระดิ่ง และเมนูผู้ใช้บน top bar ยังกดไม่ได้ | สูง | ค้นหาด่วน `Ctrl K` · ลิงก์การแจ้งเตือนและโปรไฟล์ในหน้าแรก |
| R2 | `<main>` ไม่มี `min-w-0` ทำให้ทั้งหน้าเลื่อนแนวนอนได้ | สูง | ครอบเนื้อหาใน `layout.tsx` ด้วย `w-0 min-w-full` |
| R3 | ไม่มี skip link และไม่ซ่อนเมนูตอนพิมพ์ | สูง | skip link และ `print:` variant ใน `layout.tsx` |
| R4 | ไอคอนเมนูเลือกได้แค่ 10 แบบ | กลาง | ใช้ไอคอนที่ใกล้ที่สุด (สติกเกอร์ QR ใช้ `settings`) |
| R5 | ไม่มีโหมดย่อ sidebar | ต่ำ | ไม่มี — ถอดออกตามข้อ 5.2 |
| R6 | Modal ไม่กัก focus · ConfirmDeleteModal ไม่มี loading/error/คำกริยาจริง | สูง | `DialogFocus` · `DeleteMessage` |
| R7 | class ใน `ui.ts` ขาด focus ring, disabled, พื้นที่กด 44px | สูง | `components/shared/ui.ts` (`buttonClass`) |
| R8 | `Tabs` ไม่รองรับ tab ที่เก็บใน URL | กลาง | `RouteTabs` |
| R9 | ไอคอนที่ระบบนี้ใช้แต่ชุดกลางยังไม่มี 29 ตัว | กลาง | `components/shared/icons.tsx` |
| R10 | component ในข้อ 7.1 ที่ template ยังไม่มี | กลาง | local component 10 ตัว |
| R11 | จุด loading ของปุ่มเป็นสีขาวเสมอ | ต่ำ | `LoadingButton` ใช้สีตัวอักษรของปุ่ม |
| R12 | `transition: all` ใน `globals.css` | ต่ำ | ไม่มี (เป็นไฟล์กลาง) |
| R13 | hex สีขาวใน `globals.css` ทำให้ UI-01 ของมาตรฐาน v1.0.0 ไม่ผ่าน | สูง | เขียนเป็น `white` (สีเดียวกัน) |
| R14 | template ใช้ Tailwind v4 แต่ whitelist ยังไม่มี `@tailwindcss/postcss` | สูง | Tailwind v3 + token ชุดเดียวกัน |
| R15 | `--font-display` ไม่มี Noto Sans Thai ต่อท้าย | ต่ำ | ไม่มี (ใช้ค่าเดียวกับ template) |
| N1 | ข้อสังเกตถึงทีม design system: package 1.3.0 ขัดกับมาตรฐาน | สูง | ไม่ติดตั้ง package (ข้อ 17.0) |

---

## R1 — top bar: ค้นหา · การแจ้งเตือน · เมนูผู้ใช้ ยังกดไม่ได้

- **ปัญหา:** ช่องค้นหาเป็น `<input>` ที่ไม่ได้ส่งค่าไปไหน · ปุ่มกระดิ่งไม่มี `onClick` / `href` และไม่มีตัวนับ ·
  avatar กับชื่อบทบาทเป็นปุ่มที่ไม่ทำอะไร — ผู้ใช้กดแล้วไม่มีอะไรเกิดขึ้น
- **หน้าจอที่ต้องการ:** ค้นหาใบแจ้งซ่อมจากเลขที่/สิ่งที่ชำรุด · จุดแดงเมื่อมีการแจ้งเตือนใหม่แล้วกดไปหน้าการแจ้งเตือน ·
  เมนูผู้ใช้ที่มีชื่อ อีเมล บทบาท ลิงก์ "โปรไฟล์" และ "ออกจากระบบ" (ข้อ 5.1 ระบุว่าเมนูผู้ใช้และการแจ้งเตือนมาจาก AppShell)
- **ทำไมของเดิมไม่พอ:** ระบบย่อยห้ามวาด header เอง (ข้อ 0 กฎ 4) จึงเติมพฤติกรรมให้ส่วนนี้ไม่ได้เลย
- **ข้อเสนอ:** prop ของ `CsmjuAppShell`
  - `search?: { placeholder?: string; onOpen?: () => void }` หรือ `searchSlot?: ReactNode`
  - `notifications?: { href: string; unread?: number }` — แสดงจุดแดงเมื่อ `unread > 0` และ `aria-label` บอกจำนวน
  - `user: { initials, roleLabel, name?, email?, avatarUrl?, profileHref? }` แล้วทำ avatar เป็นปุ่มเปิดเมนู (`role="menu"`)
- **ระหว่างรอ:** ค้นหาด่วนเปิดด้วย `Ctrl K` (`CommandPalette`) · หน้าแรกมีลิงก์ "โปรไฟล์ของฉัน" และ
  "การแจ้งเตือนที่ยังไม่อ่าน N รายการ" · เมนู "การแจ้งเตือน" อยู่ใน sidebar

## R2 — `<main>` ของ AppShell ทำให้ทั้งหน้าล้นแนวนอน

- **ปัญหา:** `<main className="ml-0 flex min-h-dvh flex-1 flex-col md:ml-64">` เป็น flex item ที่ไม่มี `min-w-0`
  ตารางกว้าง ๆ หรือข้อความ `truncate` จึงดันความกว้างของ `<main>` ให้เกินจอ — วัดจริงที่ 390px หน้า "ผู้ใช้และช่าง" กว้าง 1,045px
- **ทำไมของเดิมไม่พอ:** ข้อ 6.1 ห้ามมี horizontal scroll ทั้งหน้าเด็ดขาด ตารางต้องเลื่อนภายในการ์ด (ข้อ 6.2)
- **ข้อเสนอ:** เพิ่ม `min-w-0` ที่ `<main>` (บรรทัดเดียว)
- **ระหว่างรอ:** `layout.tsx` ครอบ `children` ด้วย `<div className="w-0 min-w-full space-y-8">` (ระยะห่างเท่าเดิม)

## R3 — skip link · การพิมพ์ · scrim

- **ปัญหา:** ไม่มีลิงก์ "ข้ามไปยังเนื้อหาหลัก" (ข้อ 5.1 ระบุว่ายังไม่มี และข้อ 12.1 ต้องมี) · ตอนพิมพ์ใบงานหรือสติกเกอร์
  sidebar, top bar และ footer ถูกพิมพ์ไปด้วย · scrim ของ drawer เป็น `<div onClick>` (UI-03)
- **ข้อเสนอ:** เพิ่ม skip link เป็นลูกตัวแรกของ AppShell · ใส่ `print:hidden` ที่ `<aside>`, `<header>`, `<footer>` และ
  `print:ml-0` ที่ `<main>` · scrim ใช้ `<button type="button" tabIndex={-1} aria-label="ปิดเมนู">`
- **ระหว่างรอ:** skip link อยู่หน้าสุดของ `<body>` ใน `layout.tsx` · `print:[&_aside.brand-gradient]:hidden` และ variant อื่นที่ `<body>`

## R4 — ไอคอนของเมนูใน sidebar

- **ปัญหา:** `NavIconName` มี 10 แบบ (dashboard, group, school, campaign, settings, meeting-room, menu-book, receipt, event, description)
  ระบบนี้มีเมนู 9 รายการที่ต้องการ assignment, inbox, chart, qr-code, category, notifications
- **ข้อเสนอ:** รับ `icon` เป็น component ได้ด้วย (เช่น `icon: NavIconName | ComponentType<SVGProps<SVGSVGElement>>`)
  หรือเพิ่มชื่อไอคอนข้างบนเข้าชุดกลาง
- **ระหว่างรอ:** ใช้ความหมายแบบเดียวกับ core hub — `event` = คิวงานตามกำหนดเวลา · `receipt` = สถิติ/ผลลัพธ์ ·
  `menu-book` = หมวดหมู่ · `campaign` = การแจ้งเตือน · สติกเกอร์ QR ใช้ `settings` เพราะไม่มีไอคอนที่ใกล้กว่า

## R5 — sidebar แบบย่อเป็นแถบไอคอน (ตัวเลือก)

- **ปัญหา:** เจ้าของระบบเคยขอให้ sidebar ย่อเป็นแถบไอคอน 72px แล้วกางเมื่อชี้เมาส์ (2026-09-25) แต่ข้อ 5.2 ระบุว่า
  "ไม่มีโหมด collapse" จึงถอดออกแล้วใช้ AppShell ของกลางตามเดิม
- **ข้อเสนอ:** ให้ PM พิจารณาเป็นตัวเลือกของ AppShell (`collapsible`) ที่ผู้ใช้ตรึงได้ — โค้ดต้นแบบอยู่ที่ commit `9a939fa`
  (hover หน่วง 90/150ms · กางเมื่อ Tab เข้าไป · จำค่าในคุกกี้ · เคารพ `prefers-reduced-motion`)
- **ระหว่างรอ:** ไม่มี

## R6 — Modal และ ConfirmDeleteModal

- **ปัญหา:** ข้อ 8.3 ระบุว่า Modal "ต้องเพิ่ม" การกัก focus และคืน focus — ของกลางยังไม่มี · กล่องเปิดแล้ว focus ยังค้างที่ปุ่มหลังฉาก
  กด Tab ไปโดนหน้าด้านหลังได้ · ConfirmDeleteModal ใช้คำว่า "ลบ" คำเดียว (ข้อ 8.3 ให้ใช้คำกริยาจริง เช่น "ลบอาคาร")
  และไม่มีสถานะกำลังลบ/ลบไม่สำเร็จ · Modal กว้างได้แค่ `max-w-md` ฟอร์มปิดงานที่มีรูปหลังซ่อมจึงแคบ
- **ข้อเสนอ:** Modal: focus ช่อง `[data-autofocus]` หรือจุดแรก · วน Tab ในกล่อง · คืน focus เมื่อปิด · prop `size` ·
  ConfirmDeleteModal: `confirmLabel`, `loading`, `error`
- **ระหว่างรอ:** `DialogFocus` (วางในเนื้อหาของกล่อง ทำงานกับ `[role="dialog"]` ที่ครอบอยู่) · `DeleteMessage`
  (ชื่อสิ่งที่จะลบ + ผลที่ตามมา + กำลังลบ/ข้อผิดพลาด ใน prop `message`) · กันกดซ้ำในฟังก์ชันลบ

## R7 — class ของปุ่มใน `ui.ts`

- **ปัญหา:** ข้อ 7.2 บังคับสถานะ focus-visible (ระบุว่า "ยังไม่มีใน ui.ts ต้องเพิ่ม") และ disabled ครบทุกปุ่ม ·
  ข้อ 6.1 บังคับพื้นที่กด 44px แต่ปุ่มสูงราว 37px และปุ่มไอคอน 32px · `secondaryButtonClass` / `dangerButtonClass`
  ไม่มี `inline-flex` ไอคอนกับข้อความจึงไม่อยู่แนวเดียวกัน · ยังไม่มี variant tonal, link, icon-round และ class หัวการ์ด/แถวตาราง
- **ข้อเสนอ:** เพิ่มใน `ui.ts` ของกลาง — ค่าที่ระบบนี้ใช้อยู่ใน `frontend/src/components/shared/ui.ts` คัดลอกไปได้ทันที
- **ระหว่างรอ:** `buttonClass.primary` ฯลฯ = class กลาง + `relative inline-flex min-h-11 … focus-visible:outline-* disabled:*`
  (ไม่เปลี่ยนสี ฟอนต์ มุมโค้ง ตามข้อ 7.3)

## R8 — Tabs ที่เก็บ tab ไว้ใน URL

- **ปัญหา:** `Tabs` ของกลางเปลี่ยน state ในหน้า (`onChange`) แต่หน้าคิวงาน ผู้ใช้ และการแจ้งเตือนเป็น Server Component
  ที่โหลดข้อมูลตาม `?tab=` — กดย้อนกลับ/แชร์ลิงก์ต้องได้ tab เดิม · ตัวนับของ tab "เกินกำหนด" ควรเป็นสีแดงเมื่อมากกว่า 0
- **ข้อเสนอ:** รับ `href` ต่อ tab แล้ว render เป็นลิงก์ (`aria-current="page"`) และ `tone` ของตัวนับ
- **ระหว่างรอ:** `RouteTabs` ห่อ `Tabs` ของกลางแล้วเปลี่ยน URL เมื่อเลือก (ตัวนับใช้สีตามของกลาง)

## R9 — ไอคอนที่ต้องเพิ่มเข้าชุดกลาง

ระบบนี้ใช้ 29 ตัวที่ชุดกลางยังไม่มี (สไตล์เดียวกันทุกอย่าง — `frontend/src/components/shared/icons.tsx`):
Assignment · Inbox · QrCode · Camera · Image · Schedule · CheckCircle · Warning · Error · Info · ChevronRight · ChevronLeft ·
Print · Download · Star (มี prop `filled`) · Send · Pause · Play · Block · Phone · Inventory · Chat · History · Swap · ZoomIn ·
PriorityUrgent · PriorityHigh · PriorityMedium · PriorityLow

## R10 — component ในข้อ 7.1 ที่ template ยังไม่มี

ทำเป็น local component ชั่วคราวใน `frontend/src/components/` จาก class ใน `ui.ts` + token เท่านั้น:
`EmptyState` · `ErrorState` · `ForbiddenState` · `FormField` · `Toast` / `useToast` · `Skeleton` · `Pagination` · `Avatar` ·
`StatCard` · `Timeline` (รายละเอียดใน `subsystem.yaml` → `ui.local_components`)

## R11 — สีจุด loading ของปุ่ม

- **ปัญหา:** `.dots span { background-color: #fff }` ใน `globals.css` — บนปุ่มรองพื้นโปร่งใสจะมองไม่เห็นจุดเลย
- **ข้อเสนอ:** ใช้ `currentColor` (ปุ่มหลักและปุ่มลบยังเป็นสีขาวเพราะตัวอักษรเป็นสีขาว)
- **ระหว่างรอ:** `LoadingButton` ใส่ `[&_.dots_span]:bg-current`

## R12 — `transition: all` ใน `globals.css`

`.btn-gradient`, `.input-field`, checkbox และเมนู sidebar ยังใช้ `transition: all` — ข้อ 3.6 ระบุให้เปลี่ยนเป็นรายการ property

## R13 — hex สีขาวใน `globals.css` กับกฎ UI-01 ของมาตรฐาน v1.0.0

- **ปัญหา:** CI ของระบบย่อย pin `subsystem-compliance.yml@v1.0.0` ซึ่ง UI-01 ยกเว้นแค่ `*.config.*` —
  `globals.css` ของ template มีสีขาวแบบ hex 3 จุด จึงตก UI-01 ทันทีที่คัดลอกมา · มาตรฐานบน `main` แก้แล้ว
  (ยกเว้น `globals.css` และ `csmju/`) แต่ยังไม่ออกเวอร์ชัน (v1.0.1 ออกจาก tag v1.0.0 โดยไม่รวมเรื่องนี้)
- **ข้อเสนอ:** template ใช้ `white` หรือ `var(--color-on-primary)` แทน หรือมาตรฐานออกเวอร์ชันที่มีข้อยกเว้นนี้
- **ระหว่างรอ:** สำเนาใน repo นี้เขียนสามจุดนั้นเป็น `white` (สีเดียวกันทุกประการ) และบันทึกไว้ที่หัวไฟล์

## R14 — Tailwind v4 ของ template กับ whitelist

- **ปัญหา:** template ใช้ `@tailwindcss/postcss` + `tailwindcss@4` และ `eslint-config-next` แต่ `scripts/lib/allowed-deps.json`
  ยังไม่มีสองตัวนี้ (ARC-02 ตก) · ข้อ 16.0 ระบุ "Tailwind CSS v4 เท่านั้น" จึงขัดกันเอง
- **ข้อเสนอ:** DevOps เพิ่ม `@tailwindcss/postcss` และ `eslint-config-next` ใน `allowed_dev_tooling`
- **ระหว่างรอ:** Tailwind v3.4 — token ชื่อและค่าเดียวกับ `@theme` ของ template ทุกตัว (`frontend/src/theme.config.ts`,
  ตรวจด้วยสคริปต์แล้ว 30 สี · 2 ฟอนต์ · 8 ขนาดตัวอักษร) · `shadow-sm` และ `backdrop-blur-sm` ตั้งให้เท่า v4 ·
  เมื่อ whitelist อนุญาตให้ลบ `tailwind.config.ts` + `theme.config.ts` แล้วใช้ `globals.css` ของ template ตรง ๆ

## R15 — ฟอนต์หัวเรื่องภาษาไทย

ข้อ 4.1 ระบุว่า `--font-display` ต้องมี `var(--font-noto-thai)` ต่อท้าย (Plus Jakarta Sans ไม่มีอักขระไทย
หัวเรื่องไทยจึงไปใช้ฟอนต์ระบบ) แต่ `globals.css` ของ template ยังไม่มี — ระบบนี้ใช้ค่าเดียวกับ template เพื่อให้หน้าตาตรงกับ core hub

---

## N1 — ข้อสังเกตถึงทีม design system: `@csmju2030/design-system` 1.3.0 ขัดกับมาตรฐานปัจจุบัน

repo `design-system` (package 1.3.0, 7 ก.ย. 2569) ระบุว่าทำตาม `csmju2030-standards` v1.3.0 แต่มาตรฐานที่ใช้จริงคือ VERSION 1.0.0
และ `ui-design-system.md` 1.3.0 (24 ก.ย. 2569) ระบุว่า package นี้ **ยังไม่เผยแพร่** และห้ามติดตั้งจนกว่า PM จะประกาศ (ข้อ 17.0)
ระบบนี้จึงไม่ได้ติดตั้ง และพบจุดที่ต้องแก้ใน package ก่อนเผยแพร่:

| เรื่อง | package 1.3.0 | มาตรฐานปัจจุบัน |
|---|---|---|
| การเข้าสู่ระบบ | `createCsmjuAuthRoutes()` สร้าง `/auth/login`, `/auth/refresh`, `/auth/logout` และแลก token ที่ `/oauth/token` · lint DS-21/DS-22 บังคับใช้ | `auth-contract.md` v1.0 ข้อ 9 ห้ามระบบย่อยสร้าง `/login` `/logout` `/refresh` · Core Hub ไม่มี `/oauth/token` · ข้อ 7: refresh token อยู่กับ Core Hub เท่านั้น |
| claims ใน token | `sub, username, layer1_role, faculty` | `sub, email, role, sid, iss, aud, iat, exp` (ห้ามคาดหวัง `username` / `faculty`) |
| token สี/ฟอนต์ | `--csmju-*` · IBM Plex Sans Thai | Material 3 (`primary-container` …) · Noto Sans Thai + Plus Jakarta Sans ตาม core hub |
| ฟอนต์ | lint DS-08 ห้าม `next/font/google` | ข้อ 4.1 / 16.1.1 อนุญาต (self-host ตอน build) และ template ใช้อยู่ |
| ชื่อ field JSON | ให้หน้าเว็บใช้ snake_case | `api-conventions.md` และ `contracts/vocabulary.json` กำหนด camelCase |

ผลของ `csmju-ui-lint` กับระบบนี้ (รันจาก `design-system/tools/csmju-ui-lint.mjs`): 33 error · 27 warning
- error ทั้งหมดมาจากตารางข้างบน — UI-01 30 จุดใน `theme.config.ts` (token ของ template ที่ย้ายมาเพราะ R14 · มาตรฐานยกเว้น `*.config.*`) ·
  DS-08 (`next/font/google`) · DS-13 (ไม่มี package) · DS-22 (ไม่มี `createCsmjuAuthRoutes`)
- warning: 16 จุดจากไฟล์ของ template (`csmju/`, `globals.css`) · DS-14 9 จุดจาก local component ใน R10 ·
  SEC-02 2 จุดจาก URL ตั้งต้นของเครื่อง dev ใน `.env.example` (ตัวอย่างใน `ci-compliance-spec.md` ข้อ 10.3 ก็ใส่ URL)
