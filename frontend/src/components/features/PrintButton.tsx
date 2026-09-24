'use client';

import { primaryButtonClass, PrintIcon } from '@/csmju';

export function PrintButton({ label = 'พิมพ์' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={primaryButtonClass}>
      <PrintIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
