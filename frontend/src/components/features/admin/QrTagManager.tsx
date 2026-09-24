'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  AddIcon,
  ConfirmDeleteModal,
  DeleteIcon,
  EditIcon,
  iconButtonClass,
  iconDangerButtonClass,
  inputClass,
  Modal,
  primaryButtonClass,
  PrintIcon,
  QrCodeIcon,
  secondaryButtonClass,
  tableClass,
  tbodyRowClass,
  tdClass,
  theadRowClass,
  thClass,
} from '@/csmju';
import { EmptyState } from '@/components/shared/EmptyState';
import { FormField } from '@/components/shared/FormField';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { useToast } from '@/components/shared/Toast';
import { api, ApiRequestError } from '@/lib/api';
import { floorLabel, formatNumber, placeText } from '@/lib/format';
import type { QrTag } from '@/lib/types';

type Option = { value: string; label: string };
const FLOORS = [-2, -1, 0, ...Array.from({ length: 15 }, (_, i) => i + 1)];

/** จัดการสติกเกอร์ QR: สร้าง/แก้/ลบ และเลือกหลายรายการเพื่อพิมพ์เป็นแผ่นสติกเกอร์ */
export function QrTagManager({
  items,
  buildings,
  categories,
}: {
  items: QrTag[];
  buildings: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<QrTag | 'new' | null>(null);
  const [deleting, setDeleting] = useState<QrTag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/qr-tags/${deleting.id}`, { method: 'DELETE' });
      toast.success(`ลบสติกเกอร์ ${deleting.code} แล้ว`);
      setDeleting(null);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const printHref = `/admin/qr-tags/print?ids=${[...selected].join(',')}`;

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {selected.size > 0 ? (
            <Link href={printHref} className={secondaryButtonClass}>
              <PrintIcon className="h-4 w-4" />
              พิมพ์ที่เลือก ({selected.size})
            </Link>
          ) : (
            <span className="text-body-md text-on-surface-variant">
              เลือกสติกเกอร์เพื่อพิมพ์หลายชิ้นพร้อมกัน
            </span>
          )}
        </div>
        <button type="button" onClick={() => setEditing('new')} className={primaryButtonClass}>
          <AddIcon className="h-4 w-4" />
          สร้างสติกเกอร์ QR
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={QrCodeIcon}
          title="ยังไม่มีสติกเกอร์ QR"
          description="สร้างสติกเกอร์ให้ห้องหรืออุปกรณ์ที่แจ้งซ่อมบ่อย ผู้ใช้สแกนแล้วฟอร์มจะกรอกสถานที่ให้เอง"
          action={
            <button type="button" onClick={() => setEditing('new')} className={primaryButtonClass}>
              <AddIcon className="h-4 w-4" />
              สร้างสติกเกอร์ QR
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className={theadRowClass}>
                <th scope="col" className={`${thClass} w-12`}>
                  <input
                    type="checkbox"
                    aria-label="เลือกทั้งหมดในหน้านี้"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </th>
                <th scope="col" className={thClass}>
                  รหัส
                </th>
                <th scope="col" className={`${thClass} min-w-72`}>
                  สถานที่ / อุปกรณ์
                </th>
                <th scope="col" className={thClass}>
                  หมวดหมู่
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  แจ้งผ่าน QR
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((tag) => (
                <tr key={tag.id} className={tbodyRowClass}>
                  <td className={tdClass}>
                    <input
                      type="checkbox"
                      aria-label={`เลือกสติกเกอร์ ${tag.code}`}
                      checked={selected.has(tag.id)}
                      onChange={() => toggle(tag.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className={`${tdClass} font-medium tabular-nums text-on-surface`}>{tag.code}</td>
                  <td className={tdClass}>
                    <p className="text-on-surface">{placeText(tag.building.name, tag.floor, tag.location)}</p>
                    {tag.equipment ? (
                      <p className="text-caption text-on-surface-variant">
                        {tag.equipment}
                        {tag.assetNumber ? ` · ${tag.assetNumber}` : ''}
                      </p>
                    ) : null}
                  </td>
                  <td className={`${tdClass} text-on-surface-variant`}>{tag.category?.name ?? '—'}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatNumber(tag.requestCount)}
                    {tag.openRequests.length ? (
                      <span className="block text-caption text-on-surface-variant">
                        ค้าง {tag.openRequests.length}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <Link
                      href={`/admin/qr-tags/print?ids=${tag.id}`}
                      aria-label={`พิมพ์สติกเกอร์ ${tag.code}`}
                      className={iconButtonClass}
                    >
                      <PrintIcon className="h-5 w-5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditing(tag)}
                      aria-label={`แก้ไขสติกเกอร์ ${tag.code}`}
                      className={iconButtonClass}
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setDeleting(tag);
                      }}
                      aria-label={`ลบสติกเกอร์ ${tag.code}`}
                      className={iconDangerButtonClass}
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

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'สร้างสติกเกอร์ QR' : 'แก้ไขสติกเกอร์ QR'}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing !== null ? (
          <QrTagForm
            key={editing === 'new' ? 'new' : editing.id}
            current={editing === 'new' ? null : editing}
            buildings={buildings}
            categories={categories}
            onCancel={() => setEditing(null)}
            onSaved={(tag, created) => {
              toast.success(created ? `สร้างสติกเกอร์ ${tag.code} แล้ว` : `บันทึกสติกเกอร์ ${tag.code} แล้ว`);
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDeleteModal
        open={deleting !== null}
        title="ลบสติกเกอร์ QR"
        itemName={deleting ? `${deleting.code} (${deleting.location})` : ''}
        consequence="สติกเกอร์ที่ติดอยู่จะสแกนไม่ได้อีก ใบแจ้งซ่อมเดิมที่แจ้งผ่าน QR นี้ยังอยู่ครบ"
        confirmLabel="ลบสติกเกอร์"
        loading={busy}
        error={error}
        onConfirm={() => void remove()}
        onClose={() => !busy && setDeleting(null)}
      />
    </>
  );
}

function QrTagForm({
  current,
  buildings,
  categories,
  onCancel,
  onSaved,
}: {
  current: QrTag | null;
  buildings: Option[];
  categories: Option[];
  onCancel: () => void;
  onSaved: (tag: QrTag, created: boolean) => void;
}) {
  const [values, setValues] = useState({
    buildingId: current?.building.id ?? '',
    floor: current?.floor === null || current?.floor === undefined ? '' : String(current.floor),
    location: current?.location ?? '',
    equipment: current?.equipment ?? '',
    assetNumber: current?.assetNumber ?? '',
    categoryId: current?.category?.id ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!values.buildingId) found.buildingId = 'กรุณาเลือกอาคาร';
    if (values.location.trim().length < 2) found.location = 'กรุณาระบุสถานที่ อย่างน้อย 2 ตัวอักษร';
    if (values.equipment.trim() && values.equipment.trim().length < 2)
      found.equipment = 'ชื่ออุปกรณ์ต้องยาวอย่างน้อย 2 ตัวอักษร';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError(null);
    const payload = {
      buildingId: values.buildingId,
      floor: values.floor === '' ? (current ? null : undefined) : Number(values.floor),
      location: values.location.trim(),
      equipment: values.equipment.trim() || (current ? null : undefined),
      assetNumber: values.assetNumber.trim() || (current ? null : undefined),
      categoryId: values.categoryId || (current ? null : undefined),
    };
    try {
      const { data } = await api<QrTag>(current ? `/api/v1/qr-tags/${current.id}` : '/api/v1/qr-tags', {
        method: current ? 'PATCH' : 'POST',
        json: payload,
      });
      onSaved(data, !current);
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.code === 'VALIDATION_ERROR')
        setErrors(failure.fieldErrors());
      else setFormError(failure instanceof Error ? failure.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const invalid = (key: string) => (errors[key] ? 'input-error' : '');
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
      {current ? (
        <p className="text-body-md text-on-surface-variant">
          รหัส <strong className="tabular-nums text-on-surface">{current.code}</strong> คงเดิม —
          สติกเกอร์ที่ติดอยู่แล้วใช้ต่อได้
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <FormField id="qr-building" label="อาคาร" required error={errors.buildingId}>
          <select
            id="qr-building"
            data-autofocus
            aria-required="true"
            value={values.buildingId}
            onChange={(e) => set('buildingId', e.target.value)}
            className={`${inputClass} ${invalid('buildingId')}`}
          >
            <option value="">เลือกอาคาร</option>
            {buildings.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="qr-floor" label="ชั้น">
          <select
            id="qr-floor"
            value={values.floor}
            onChange={(e) => set('floor', e.target.value)}
            className={inputClass}
          >
            <option value="">ไม่ระบุ</option>
            {FLOORS.map((floor) => (
              <option key={floor} value={String(floor)}>
                {floorLabel(floor)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField id="qr-location" label="ห้อง / จุด" required error={errors.location}>
        <input
          id="qr-location"
          aria-required="true"
          maxLength={150}
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
          className={`${inputClass} ${invalid('location')}`}
        />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          id="qr-equipment"
          label="อุปกรณ์"
          hint="เว้นว่างถ้าเป็นสติกเกอร์ของทั้งห้อง"
          error={errors.equipment}
        >
          <input
            id="qr-equipment"
            aria-describedby="qr-equipment-hint"
            maxLength={150}
            value={values.equipment}
            onChange={(e) => set('equipment', e.target.value)}
            className={`${inputClass} ${invalid('equipment')}`}
          />
        </FormField>
        <FormField id="qr-asset" label="เลขครุภัณฑ์" error={errors.assetNumber}>
          <input
            id="qr-asset"
            maxLength={50}
            value={values.assetNumber}
            onChange={(e) => set('assetNumber', e.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>
      <FormField id="qr-category" label="หมวดหมู่ที่เลือกไว้ให้" hint="ไม่บังคับ">
        <select
          id="qr-category"
          aria-describedby="qr-category-hint"
          value={values.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          className={inputClass}
        >
          <option value="">ให้ผู้แจ้งเลือกเอง</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className={secondaryButtonClass} disabled={busy}>
          ยกเลิก
        </button>
        <LoadingButton type="submit" loading={busy} className={primaryButtonClass}>
          บันทึก
        </LoadingButton>
      </div>
    </form>
  );
}
