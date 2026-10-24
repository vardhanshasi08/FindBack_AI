import React from 'react';
import PageHeader from '@/components/PageHeader';
import ReportForm from '@/components/report/ReportForm';

export default function ReportLost() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Lost item"
        title="Report a lost item"
        description="Describe what you lost. Your report is saved with a unique ID, linked to your account and compared with items other people reported finding."
      />
      <ReportForm kind="lost" />
    </div>
  );
}