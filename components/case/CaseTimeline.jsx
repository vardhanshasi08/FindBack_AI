import React from 'react';
import { History } from 'lucide-react';
import { formatDateTime, statusLabel } from '@/lib/status';
import { relativeTime } from '@/lib/status';

const ACTION_LABELS = {
  LOST_REPORT_SUBMITTED: 'Lost report submitted',
  FOUND_REPORT_SUBMITTED: 'Found report submitted',
  LOST_REPORT_UPDATED: 'Lost report edited',
  FOUND_REPORT_UPDATED: 'Found report edited',
  AI_MATCH_RUN: 'AI matching run',
  AI_MATCH_FAILED: 'AI matching failed',
  MATCH_DECLINED: 'Owner declined the match',
  CLAIM_REQUESTED: 'Claim requested',
  CLAIM_APPROVED: 'Claim approved by Global Admin',
  CLAIM_REJECTED: 'Claim rejected by Global Admin',
  HANDOVER_SCHEDULED: 'Handover scheduled',
  HANDOVER_UPDATED: 'Handover updated',
  OTP_ISSUED: 'Handover code generated',
  OTP_MISMATCH: 'Incorrect handover code',
  CASE_RETURNED: 'Item returned — case closed',
  SECRET_VIEWED: 'Protected ownership detail opened',
};

export default function CaseTimeline({ events, title = 'Case history', emptyText = 'No history recorded yet.' }) {
  return (
    <div className="fb-card p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <History className="h-4 w-4 text-violet-300" /> {title}
      </h3>
      {!events?.length ? (