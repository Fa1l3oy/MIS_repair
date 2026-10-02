'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * วางไว้ในเนื้อหาของ `Modal` / `ConfirmDeleteModal` จาก `@/csmju` — Modal ของกลางยังไม่กัก focus และไม่คืน focus
 * (ui-design-system.md ข้อ 8.3 ระบุว่า "ต้องเพิ่ม") จึงเสริมจากภายนอกโดยไม่แก้ไฟล์ของกลาง:
 * เปิดแล้ว focus ช่องที่มี data-autofocus (หรือจุดแรกที่กดได้) · Tab / Shift+Tab วนอยู่ในกล่อง · ปิดแล้วคืน focus จุดเดิม
 * local component ชั่วคราว — ลบทิ้งเมื่อ Modal ของกลางทำเองแล้ว (คำขอใน docs/design-system-requests.md)
 */
export function DialogFocus() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dialog = marker.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () =>
      [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.offsetParent !== null);
    (dialog.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialog.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return <span ref={marker} hidden />;
}
