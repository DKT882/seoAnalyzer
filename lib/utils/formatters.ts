import { IssueSeverity } from '@/types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function getScoreColor(score: number): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
} {
  if (score >= 85) {
    return {
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      label: 'Excellent',
    };
  }
  if (score >= 70) {
    return {
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.12)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      label: 'Good',
    };
  }
  if (score >= 50) {
    return {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      label: 'Needs Work',
    };
  }
  return {
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    label: 'Poor',
  };
}

export function getSeverityStyle(severity: IssueSeverity): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        color: '#f43f5e',
        bgColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
        label: 'Critical',
      };
    case 'WARNING':
      return {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        label: 'Warning',
      };
    case 'RECOMMENDATION':
      return {
        color: '#818cf8',
        bgColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.35)',
        label: 'Recommendation',
      };
    case 'INFO':
      return {
        color: '#38bdf8',
        bgColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        label: 'Info',
      };
    case 'NOT_MEASURED':
      return {
        color: '#94a3b8',
        bgColor: 'rgba(148, 163, 184, 0.15)',
        borderColor: 'rgba(148, 163, 184, 0.35)',
        label: 'Not Measured',
      };
    case 'GOOD':
    default:
      return {
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        label: 'Passed',
      };
  }
}
