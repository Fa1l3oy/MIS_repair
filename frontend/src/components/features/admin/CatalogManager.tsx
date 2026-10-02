'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  AddIcon,
  ConfirmDeleteModal,
  DeleteIcon,
  EditIcon,
  inputClass,
  Modal,
  StatusBadge,
  tdClass,
  thClass,
} from '@/csmju';
import { buttonClass, tableClass, tbodyRowClass, theadRowClass } from '@/components/shared/ui';
import { DeleteMessage } from '@/components/shared/DeleteMessage';
import { DialogFocus } from '@/components/shared/DialogFocus';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormField } from '@/components/shared/FormField';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api, ApiRequestError } from '@/lib/api';
import { formatNumber } from '@/lib/format';

export type CatalogItem = {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  requestCount: number;
  qrTagCount?: number;
};

type Kind = 'buildings' | 'categories';
const NOUN: Record<Kind, string> = { buildings: 'อาคาร', categories: 'หมวดหมู่' };

/**
 * จัดการอาคาร/หมวดหมู่ — ตารางตามสเปค DataTable (ข้อ 8.2) · ฟอร์มสั้นใน Modal · ลบผ่าน ConfirmDeleteModal
 * ของที่มีใบแจ้งซ่อมอ้างถึงลบไม่ได้ (backend ตอบ 409) — แสดงเหตุผลตั้งแต่ก่อนกด และแนะนำให้ปิดการใช้งานแทน
 */
export function CatalogManager({ kind, items }: { kind: Kind; items: CatalogItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const noun = NOUN[kind];
  const [editing, setEditing] = useState<CatalogItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/${kind}/${deleting.id}`, { method: 'DELETE' });
      toast.success(`ลบ${noun} “${deleting.name}” แล้ว`);
      setDeleting(null);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: CatalogItem) => {
    try {
      await api(`/api/v1/${kind}/${item.id}`, { method: 'PATCH', json: { isActive: !item.isActive } });
      toast.success(item.isActive ? `ปิดการใช้งาน “${item.name}” แล้ว` : `เปิดใช้งาน “${item.name}” แล้ว`);
      router.refresh();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'บันทึกไม่สำเร็จ');
    }
  };

  const usage = (item: CatalogItem) =>
    item.requestCount + (item.qrTagCount ?? 0) > 0
      ? `มีใบแจ้งซ่อม ${formatNumber(item.requestCount)} รายการ${
          item.qrTagCount ? ` และสติกเกอร์ QR ${formatNumber(item.qrTagCount)} ชิ้น` : ''
        }อ้างถึงอยู่ จึงลบไม่ได้ ให้ปิดการใช้งานแทน`
      : null;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <p className="text-body-md text-on-surface-variant">
          ทั้งหมด {formatNumber(items.length)} รายการ · ที่ปิดการใช้งานจะไม่แสดงในฟอร์มแจ้งซ่อม
        </p>
        <button type="button" onClick={() => setEditing('new')} className={buttonClass.primary}>
          <AddIcon className="h-4 w-4" />
          เพิ่ม{noun}
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={`ยังไม่มี${noun}`}
          description={`เพิ่ม${noun}ก่อน ผู้ใช้จึงจะเลือกได้ในฟอร์มแจ้งซ่อม`}
          action={
            <button type="button" onClick={() => setEditing('new')} className={buttonClass.primary}>
              <AddIcon className="h-4 w-4" />
              เพิ่ม{noun}
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th scope="col" className={thClass}>
                  ชื่อ{noun}
                </th>
                {kind === 'buildings' ? (
                  <th scope="col" className={thClass}>
                    รหัส
                  </th>
                ) : null}
                <th scope="col" className={`${thClass} text-right`}>
                  ใบแจ้งซ่อม
                </th>
                {kind === 'buildings' ? (
                  <th scope="col" className={`${thClass} text-right`}>
                    สติกเกอร์ QR
                  </th>
                ) : null}
                <th scope="col" className={thClass}>
                  สถานะ
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={tbodyRowClass}>
                  <td className={`${tdClass} font-medium text-on-surface`}>{item.name}</td>
                  {kind === 'buildings' ? (
                    <td className={`${tdClass} text-on-surface-variant tabular-nums`}>{item.code ?? '—'}</td>
                  ) : null}
                  <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(item.requestCount)}</td>
                  {kind === 'buildings' ? (
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatNumber(item.qrTagCount ?? 0)}
                    </td>
                  ) : null}
                  <td className={tdClass}>
                    <button
                      type="button"
                      onClick={() => void toggle(item)}
                      aria-label={`${item.isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'} ${item.name}`}
                      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                    >
                      <StatusBadge
                        tone={item.isActive ? 'success' : 'neutral'}
                        label={item.isActive ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
                      />
                    </button>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label={`แก้ไข ${item.name}`}
                      className={buttonClass.icon}
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setDeleting(item);
                      }}
                      aria-label={`ลบ ${item.name}`}
                      className={buttonClass.iconDanger}
                    >
                      <DeleteIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CatalogDialog
        kind={kind}
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={(name, created) => {
          toast.success(created ? `เพิ่ม${noun} “${name}” แล้ว` : `บันทึก “${name}” แล้ว`);
          setEditing(null);
          router.refresh();
        }}
      />
      {deleting !== null ? (
        <ConfirmDeleteModal
          title={`ลบ${noun}`}
          message={
            <DeleteMessage
              itemName={deleting.name}
              consequence="รายการนี้จะถูกลบถาวร"
              busy={busy}
              error={error}
            />
          }
          blockedReason={usage(deleting) ?? undefined}
          onConfirm={() => void remove()}
          onClose={() => !busy && setDeleting(null)}
        />
      ) : null}
    </>
  );
}

function CatalogDialog({
  kind,
  item,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item: CatalogItem | 'new' | null;
  onClose: () => void;
  onSaved: (name: string, created: boolean) => void;
}) {
  if (item === null) return null;
  const creating = item === 'new';
  const current = creating ? null : item;
  return (
    <Modal title={creating ? `เพิ่ม${NOUN[kind]}` : `แก้ไข${NOUN[kind]}`} onClose={onClose}>
      <DialogFocus />
      <CatalogForm
        key={creating ? 'new' : item.id}
        kind={kind}
        current={current}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

function CatalogForm({
  kind,
  current,
  onCancel,
  onSaved,
}: {
  kind: Kind;
  current: CatalogItem | null;
  onCancel: () => void;
  onSaved: (name: string, created: boolean) => void;
}) {
  const [name, setName] = useState(current?.name ?? '');
  const [code, setCode] = useState(current?.code ?? '');
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = 'ชื่อต้องยาวอย่างน้อย 2 ตัวอักษร';
    if (kind === 'buildings' && code.trim() && !/^[A-Za-z0-9-]{1,10}$/.test(code.trim())) {
      found.code = 'รหัสใช้ได้เฉพาะ A–Z ตัวเลข และ - ไม่เกิน 10 ตัว';
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError(null);
    const payload: Record<string, unknown> = { name: name.trim() };
    if (kind === 'buildings')
      payload.code = code.trim() ? code.trim().toUpperCase() : current ? null : undefined;
    try {
      await api(current ? `/api/v1/${kind}/${current.id}` : `/api/v1/${kind}`, {
        method: current ? 'PATCH' : 'POST',
        json: payload,
      });
      onSaved(name.trim(), !current);
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.code === 'VALIDATION_ERROR')
        setErrors(failure.fieldErrors());
      else setFormError(failure instanceof Error ? failure.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError ? (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
        >
          {formError}
        </p>
      ) : null}
      <FormField id="catalog-name" label={`ชื่อ${NOUN[kind]}`} required error={errors.name}>
        <input
          id="catalog-name"
          data-autofocus
          aria-required="true"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'catalog-name-error' : undefined}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${inputClass} ${errors.name ? 'input-error' : ''}`}
        />
      </FormField>
      {kind === 'buildings' ? (
        <FormField
          id="catalog-code"
          label="รหัสอาคาร"
          hint="ไม่บังคับ · ใช้บนป้าย/เอกสาร เช่น CS, LEC1"
          error={errors.code}
        >
          <input
            id="catalog-code"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby="catalog-code-hint"
            maxLength={10}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className={`${inputClass} ${errors.code ? 'input-error' : ''}`}
          />
        </FormField>
      ) : null}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className={buttonClass.secondary} disabled={busy}>
          ยกเลิก
        </button>
        <LoadingButton type="submit" loading={busy} className={buttonClass.primary}>
          บันทึก
        </LoadingButton>
      </div>
    </form>
  );
}
