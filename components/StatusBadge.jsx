import React from 'react';
import { statusClasses, statusDotClasses, statusLabel } from '@/lib/status';

export default function StatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses(
        status
      )} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(status)}`} />
      {statusLabel(status)}
    </span>
  );
}