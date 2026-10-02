'use client';

import { PrintIcon } from '@/components/shared/icons';
import { buttonClass } from '@/components/shared/ui';

export function PrintButton({ label = 'พิมพ์' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass.primary}>
      <PrintIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
