import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowBackIcon, secondaryButtonClass } from '@/csmju';
import { OriginQrCode } from '@/components/features/OriginQrCode';
import { PrintButton } from '@/components/features/PrintButton';
import { EmptyState } from '@/components/shared/EmptyState';
import { floorLabel } from '@/lib/format';
import { serverApi } from '@/lib/server-api';
import type { QrTag } from '@/lib/types';

export const metadata: Metadata = { title: 'พิมพ์สติกเกอร์ QR' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** แผ่นสติกเกอร์ QR (A4 · 2 คอลัมน์) — แต่ละชิ้นมี QR ของ /q/<รหัส> + สถานที่ + รหัสสำหรับพิมพ์เอง */
export default async function PrintQrTagsPage(props: PageProps<'/admin/qr-tags/print'>) {
  const params = await props.searchParams;
  const ids = (typeof params.ids === 'string' ? params.ids.split(',') : [])
    .filter((id) => UUID.test(id))
    .slice(0, 60);
  const results = await Promise.all(ids.map((id) => serverApi<QrTag>(`/api/v1/qr-tags/${id}`)));
  const tags = results.flatMap((result) => (result.ok ? [result.data] : []));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/qr-tags" className={secondaryButtonClass}>
          <ArrowBackIcon className="h-4 w-4" />
          กลับไปที่สติกเกอร์ QR
        </Link>
        {tags.length ? <PrintButton label={`พิมพ์ ${tags.length} ชิ้น`} /> : null}
      </div>
      {tags.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
          <EmptyState
            title="ยังไม่ได้เลือกสติกเกอร์"
            description="กลับไปเลือกสติกเกอร์ที่ต้องการพิมพ์จากรายการ"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
          {tags.map((tag) => (
            <article
              key={tag.id}
              className="print-sheet flex break-inside-avoid items-center gap-4 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-4"
            >
              <OriginQrCode path={`/q/${tag.code}`} size={132} label={`QR แจ้งซ่อม ${tag.location}`} />
              <div className="min-w-0 space-y-1">
                <p className="font-display text-headline-md text-primary-container">แจ้งซ่อม</p>
                <p className="text-body-md text-on-surface">สแกนด้วยกล้องมือถือ</p>
                <p className="text-label-md text-on-surface">{tag.equipment ?? tag.location}</p>
                <p className="text-caption text-on-surface-variant">
                  {tag.building.name}
                  {tag.floor !== null ? ` · ${floorLabel(tag.floor)}` : ''} · {tag.location}
                </p>
                <p className="text-caption text-on-surface-variant">
                  รหัส <span className="font-semibold tabular-nums text-on-surface">{tag.code}</span> · CSMJU
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
