'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomInIcon } from '@/csmju';
import { formatDateTime } from '@/lib/format';
import type { RepairImage } from '@/lib/types';

/**
 * รูปก่อน/หลังซ่อม + lightbox (Esc ปิด · ← → เลื่อนรูป) — รูปโหลดผ่าน API ที่ตรวจสิทธิ์ด้วยคุกกี้ของผู้ใช้
 * จึงใช้ next/image แบบ unoptimized (ตัวย่อรูปของ Next.js ไม่มีคุกกี้ของผู้ใช้)
 */
export function ImageGallery({ images }: { images: RepairImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const before = images.filter((image) => image.kind === 'BEFORE');
  const after = images.filter((image) => image.kind === 'AFTER');
  const ordered = [...before, ...after];

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setIndex((current) => (current === null ? null : (current + delta + ordered.length) % ordered.length)),
    [ordered.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, close, step]);

  if (images.length === 0) return null;
  const current = index === null ? null : ordered[index];

  const group = (title: string, list: RepairImage[], offset: number) =>
    list.length > 0 ? (
      <div className="space-y-3">
        <h3 className="text-label-md text-on-surface-variant">
          {title} <span className="tabular-nums">({list.length})</span>
        </h3>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {list.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(offset + i)}
                aria-label={`ขยาย${title}ที่ ${i + 1}`}
                className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 160px, 30vw"
                  unoptimized
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                  <ZoomInIcon className="h-6 w-6" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {group('รูปก่อนซ่อม', before, 0)}
      {group('รูปหลังซ่อม', after, before.length)}
      {current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ดูรูปขนาดใหญ่"
          className="fixed inset-0 z-40 flex flex-col bg-black/90 text-white"
        >
          <div className="flex items-center justify-between gap-4 p-4">
            <p className="text-label-md">
              {current.kind === 'AFTER' ? 'รูปหลังซ่อม' : 'รูปก่อนซ่อม'} · {index! + 1}/{ordered.length}
              <span className="ml-2 font-normal text-white/70">
                {current.uploadedBy.displayName} · {formatDateTime(current.createdAt)}
              </span>
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="ปิด"
              autoFocus
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={current.url}
              alt={current.kind === 'AFTER' ? 'รูปหลังซ่อม' : 'รูปก่อนซ่อม'}
              fill
              sizes="100vw"
              unoptimized
              className="object-contain"
            />
          </div>
          {ordered.length > 1 ? (
            <div className="flex justify-center gap-4 p-4">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="รูปก่อนหน้า"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="รูปถัดไป"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
