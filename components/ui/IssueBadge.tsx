'use client';

import React from 'react';
import { IssueSeverity } from '@/types';
import { getSeverityStyle } from '@/lib/utils/formatters';

interface IssueBadgeProps {
  severity: IssueSeverity;
  count?: number;
}

export function IssueBadge({ severity, count }: IssueBadgeProps) {
  const { color, bgColor, borderColor, label } = getSeverityStyle(severity);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '0.2rem 0.55rem',
        borderRadius: 'var(--radius-sm)',
        color,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
      {count !== undefined && (
        <span style={{ marginLeft: '0.2rem', opacity: 0.85, fontWeight: 700 }}>({count})</span>
      )}
    </span>
  );
}
