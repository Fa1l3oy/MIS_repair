'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CloseIcon } from '@/csmju';
import { CheckCircleIcon, ErrorIcon } from '@/components/shared/icons';

type Toast = { id: number; tone: 'success' | 'error'; message: string };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Toast มาตรฐาน (ข้อ 8.4): แจ้งผลสำเร็จ 4 วินาที มุมขวาบน (desktop) / บนสุด (mobile)
 * ห้ามใช้ toast แจ้ง error ที่ผู้ใช้ต้องแก้ — ใช้ Alert inline หรือข้อความใต้ช่องแทน
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback(
    (id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)),
    [],
  );
  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
  }, []);
  const api = useMemo<ToastApi>(
    () => ({ success: (message) => push('success', message), error: (message) => push('error', message) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:top-20 md:items-end">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), 4000);
    return () => window.clearTimeout(timer);
  }, [toast.id, dismiss]);
  const Icon = toast.tone === 'success' ? CheckCircleIcon : ErrorIcon;
  return (
    <div
      role={toast.tone === 'success' ? 'status' : 'alert'}
      className="fade-slide-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 shadow-xl"
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${toast.tone === 'success' ? 'text-success' : 'text-error'}`}
      />
      <p className="flex-1 text-body-md text-on-surface">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="ปิดข้อความแจ้งเตือน"
        className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-variant/50"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast ต้องอยู่ภายใต้ ToastProvider');
  return context;
}
