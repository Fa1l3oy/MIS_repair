'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cardClass, inputClass } from '@/csmju';
import { StarIcon } from '@/components/shared/icons';
import { buttonClass } from '@/components/shared/ui';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api, ApiRequestError } from '@/lib/api';

const WORDS = ['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ดีเยี่ยม'];

/** ผู้แจ้งให้คะแนนความพึงพอใจ 1–5 ดาว (ครั้งเดียว) — ใช้ radio จึงเลือกด้วยคีย์บอร์ดลูกศรได้ */
export function RatingCard({ requestId }: { requestId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setError('กรุณาเลือกคะแนน 1–5 ดาว');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/repair-requests/${requestId}/rating`, {
        method: 'POST',
        json: { rating, ...(feedback.trim() ? { feedback: feedback.trim() } : {}) },
      });
      toast.success('ขอบคุณสำหรับคะแนน ช่างได้รับความคิดเห็นของคุณแล้ว');
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof ApiRequestError ? failure.message : 'บันทึกคะแนนไม่สำเร็จ กรุณาลองอีกครั้ง',
      );
      setBusy(false);
    }
  };

  return (
    <section
      className={`${cardClass} border-primary-container/30 p-6 print:hidden`}
      aria-labelledby="rating-title"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1">
          <h2 id="rating-title" className="font-display text-headline-md text-on-surface">
            ให้คะแนนความพึงพอใจ
          </h2>
          <p className="text-body-md text-on-surface-variant">
            คะแนนช่วยให้สาขาปรับปรุงงานซ่อมบำรุงได้ตรงจุด
          </p>
        </div>
        <fieldset>
          <legend className="sr-only">คะแนน</legend>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className="cursor-pointer rounded-lg p-1.5 hover:bg-surface has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container"
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <StarIcon
                  filled={value <= rating}
                  className={`h-8 w-8 ${value <= rating ? 'text-primary-container' : 'text-outline-variant'}`}
                />
                <span className="sr-only">{`${value} ดาว — ${WORDS[value]}`}</span>
              </label>
            ))}
            <span className="ml-2 text-label-md text-on-surface-variant" aria-live="polite">
              {rating ? WORDS[rating] : 'ยังไม่ได้เลือก'}
            </span>
          </div>
        </fieldset>
        <div className="space-y-2">
          <label htmlFor="feedback" className="block text-label-md text-on-surface">
            ความคิดเห็นเพิ่มเติม
          </label>
          <textarea
            id="feedback"
            rows={3}
            maxLength={500}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className={inputClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-label-sm text-error">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <LoadingButton type="submit" loading={busy} className={buttonClass.primary}>
            บันทึกคะแนน
          </LoadingButton>
        </div>
      </form>
    </section>
  );
}
