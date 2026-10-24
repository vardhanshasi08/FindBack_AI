import React from 'react';
import PageHeader from '@/components/PageHeader';
import ReportForm from '@/components/report/ReportForm';

export default function ReportFound() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Found item"
        title="Report an item you found"
        description="Thank you for reporting it. Your report is saved with a unique ID and compared with lost reports. Do not enter anything about the owner here — the ownership detail stays with the owner."
      />
      <ReportForm kind="found" />
    </div>
  );
}