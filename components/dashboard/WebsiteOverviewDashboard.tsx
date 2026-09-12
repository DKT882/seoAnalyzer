'use client';

import React from 'react';
import { WebsiteCrawlReport } from '@/types';
import { SiteAuditDashboard } from './SiteAuditDashboard';

interface WebsiteOverviewDashboardProps {
  report: WebsiteCrawlReport;
  onSelectPage?: (pageUrl: string) => void;
}

export function WebsiteOverviewDashboard({ report, onSelectPage }: WebsiteOverviewDashboardProps) {
  return <SiteAuditDashboard report={report} onSelectPage={onSelectPage} />;
}
