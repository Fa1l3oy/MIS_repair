'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { inputClass, primaryButtonClass, SendIcon } from '@/csmju';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api, ApiRequestError } from '@/lib/api';

/** แสดงความคิดเห็น/สอบถามในใบแจ้งซ่อม — อีกฝ่ายได้รับการแจ้งเตือน */
export function CommentBox({ requestId, placeholder }: { requestId: string; placeholder: string }) {
  const router = useRouter();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError('กรุณาพิมพ์ข้อความก่อนส่ง');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/repair-requests/${requestId}/comments`, {
        method: 'POST',
        json: { message: message.trim() },
      });
      setMessage('');
      toast.success('ส่งความคิดเห็นแล้ว');
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof ApiRequestError ? failure.message : 'ส่งความคิดเห็นไม่สำเร็จ กรุณาลองอีกครั้ง',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-3 print:hidden">
      <label htmlFor="comment" className="block text-label-md text-on-surface">
        แสดงความคิดเห็น
      </label>
      <textarea
        id="comment"
        rows={3}
        maxLength={2000}
        value={message}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'comment-error' : undefined}
        onChange={(event) => {
          setMessage(event.target.value);
          if (error) setError(null);
        }}
        className={`${inputClass} ${error ? 'input-error' : ''}`}
      />
      {error ? (
        <p id="comment-error" role="alert" className="text-label-sm text-error">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <LoadingButton type="submit" loading={busy} className={primaryButtonClass}>
          <SendIcon className="h-4 w-4" />
          ส่งความคิดเห็น
        </LoadingButton>
      </div>
    </form>
  );
}
