import type { ReactNode } from 'react';
import { ErrorIcon, fieldErrorClass, hintClass, labelClass } from '@/csmju';

/**
 * label ที่มองเห็นได้ + เครื่องหมาย * + คำอธิบาย + error ใต้ช่อง (ข้อ 8.1)
 * ช่องกรอกด้านในต้องใส่ id={id} และ aria-describedby={describedBy(id, …)} เอง
 */
export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = '',
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className={`block ${labelClass}`}>
        {label}
        {required ? (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={fieldErrorClass}>
          <ErrorIcon className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
}
