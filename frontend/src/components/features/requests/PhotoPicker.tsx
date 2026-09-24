'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { CameraIcon, CloseIcon, secondaryButtonClass } from '@/csmju';
import { prepareImage } from '@/lib/image-resize';

export type PickedPhoto = { id: string; file: File; url: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * เลือก/ถ่ายรูปประกอบ (สูงสุด max รูป) — ย่อรูปในเครื่องก่อนส่ง · แสดงภาพตัวอย่างพร้อมปุ่มลบรายรูป
 * ปุ่มเลือกเป็น <button> ที่เปิด <input type=file> ที่ซ่อนไว้ (label ของ input ยังอ่านออกด้วย screen reader)
 */
export function PhotoPicker({
  photos,
  onChange,
  max = 5,
  label = 'รูปถ่าย',
  hint = 'ไม่บังคับ · สูงสุด 5 รูป · JPG, PNG หรือ WebP (ระบบย่อรูปให้อัตโนมัติ)',
  error,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  error?: string | null;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  // คืนหน่วยความจำของภาพตัวอย่างเมื่อออกจากหน้า
  useEffect(() => () => latest.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem(null);
    const room = max - photos.length;
    const chosen = [...files].slice(0, room);
    if (files.length > room) setProblem(`แนบได้อีก ${room} รูป (สูงสุด ${max} รูป)`);
    setBusy(true);
    const prepared: PickedPhoto[] = [];
    for (const file of chosen) {
      const ready = await prepareImage(file);
      if (ready.size > MAX_BYTES) {
        setProblem(`รูป "${file.name}" ใหญ่เกิน 8 MB`);
        continue;
      }
      prepared.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: ready,
        url: URL.createObjectURL(ready),
      });
    }
    setBusy(false);
    onChange([...photos, ...prepared]);
    if (input.current) input.current.value = '';
  };

  const remove = (id: string) => {
    const photo = photos.find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    onChange(photos.filter((item) => item.id !== id));
  };

  const message = error ?? problem;
  return (
    <fieldset className="space-y-3">
      <legend className="text-label-md text-on-surface">{label}</legend>
      <p id={`${inputId}-hint`} className="text-label-sm font-normal text-on-surface-variant">
        {hint}
      </p>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative h-24 w-24 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container"
          >
            <Image
              src={photo.url}
              alt={`รูปที่ ${index + 1}`}
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(photo.id)}
              aria-label={`ลบรูปที่ ${index + 1}`}
              className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {photos.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-describedby={`${inputId}-hint`}
            className={`${secondaryButtonClass} h-24 w-24 flex-col border-dashed`}
          >
            <CameraIcon className="h-6 w-6" />
            <span className="text-label-sm">{busy ? 'กำลังเตรียม…' : 'เพิ่มรูป'}</span>
          </button>
        ) : null}
      </div>
      <label htmlFor={inputId} className="sr-only">
        เลือกรูปถ่ายประกอบ
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => void add(event.target.files)}
      />
      {message ? (
        <p role="alert" className="text-label-sm text-error">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
