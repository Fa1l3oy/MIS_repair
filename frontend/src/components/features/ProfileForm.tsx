'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { inputClass } from '@/csmju';
import { buttonClass } from '@/components/shared/ui';
import { describedBy, FormField } from '@/components/shared/FormField';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api, ApiRequestError } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import type { Me } from '@/lib/types';

type Values = { displayName: string; phone: string; workUnit: string };
type Errors = Partial<Record<keyof Values, string>>;

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (values.displayName.trim() && values.displayName.trim().length < 2)
    errors.displayName = 'ชื่อที่แสดงต้องมีอย่างน้อย 2 ตัวอักษร';
  const digits = values.phone.replace(/^\+66/, '0').replace(/[\s().-]/g, '');
  if (values.phone.trim() && !/^0\d{8,9}$/.test(digits))
    errors.phone = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลักขึ้นต้นด้วย 0 เช่น 081-234-5678';
  if (values.workUnit.trim() && values.workUnit.trim().length < 2)
    errors.workUnit = 'หน่วยงานต้องมีอย่างน้อย 2 ตัวอักษร';
  return errors;
}

/** ข้อมูลติดต่อที่เก็บในระบบแจ้งซ่อมเอง (Core Hub v1.0 ยังไม่มีชื่อ-เบอร์โทร) */
export function ProfileForm({ me }: { me: Me }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Values>({
    displayName: me.hasDisplayName ? me.displayName : '',
    phone: me.phone ? formatPhone(me.phone) : '',
    workUnit: me.workUnit ?? '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = (Object.keys(found) as (keyof Values)[])[0];
    if (first) {
      document.getElementById(`p-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await api('/api/v1/me', {
        method: 'PATCH',
        json: {
          displayName: values.displayName.trim(),
          phone: values.phone.trim(),
          workUnit: values.workUnit.trim(),
        },
      });
      toast.success('บันทึกโปรไฟล์แล้ว');
      router.refresh();
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.code === 'VALIDATION_ERROR') {
        setErrors(failure.fieldErrors() as Errors);
      } else {
        toast.error(failure instanceof Error ? failure.message : 'บันทึกไม่สำเร็จ');
      }
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Values, hint: string) => ({
    id: `p-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': describedBy(`p-${key}`, { hint, error: errors[key] }),
    className: `${inputClass} ${errors[key] ? 'input-error' : ''}`,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => set(key, event.target.value),
    onBlur: () => setErrors((current) => ({ ...current, [key]: validate(values)[key] })),
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField
        id="p-displayName"
        label="ชื่อที่แสดง"
        hint="ชื่อที่ช่างและผู้ดูแลเห็นในใบแจ้งซ่อม"
        error={errors.displayName}
      >
        <input {...field('displayName', 'x')} maxLength={100} autoComplete="name" />
      </FormField>
      <FormField
        id="p-phone"
        label="เบอร์โทรติดต่อ"
        hint="ไม่บังคับ · ให้ช่างโทรนัดเวลาเข้าซ่อม"
        error={errors.phone}
      >
        <input {...field('phone', 'x')} type="tel" inputMode="tel" maxLength={16} autoComplete="tel" />
      </FormField>
      <FormField
        id="p-workUnit"
        label="หน่วยงาน / ห้องทำงาน"
        hint="ไม่บังคับ · เช่น ห้องธุรการสาขา หรือ ห้อง CS-305"
        error={errors.workUnit}
      >
        <input {...field('workUnit', 'x')} maxLength={100} autoComplete="organization" />
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <LoadingButton type="submit" loading={busy} className={buttonClass.primary}>
          บันทึก
        </LoadingButton>
      </div>
    </form>
  );
}
