import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import PrivateImage from '@/components/PrivateImage';
import { formatDateTime, isQualifying, scoreClasses } from '@/lib/status';

export default function ReportCard({ report, kind, score, footer }) {
  const isLost = kind === 'lost';
  const location = isLost ? report.lost_location : report.found_location;
  const when = isLost ? report.lost_datetime : report.found_datetime;

  return (
    <div className="fb-card p-4 transition-colors hover:border-violet-500/40">
      <Link to={`/reports/${kind}/${report.id}`} className="flex items-start gap-4">
        <PrivateImage fileUri={report.image_file_uri} alt={report.item_name} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {report.report_code || 'Report'}
            </span>
            <StatusBadge status={report.status} />
            {typeof score === 'number' && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClasses(score)}`}>
                AI {score}/100
              </span>
            )}
            {typeof score === 'number' && isQualifying(score) && (
              <span className="text-[11px] text-cyan-300">above threshold</span>
            )}
          </div>
          <p className="mt-2 truncate font-display text-base font-semibold text-foreground">{report.item_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {report.category}
            {report.color ? ` · ${report.color}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {location || '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDateTime(when)}
            </span>
          </div>
        </div>
      </Link>
      {footer && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">{footer}</div>}
    </div>
  );
}