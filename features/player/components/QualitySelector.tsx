"use client";

import React, { useState } from 'react';
import type { QualityOption } from '../model/types';

interface QualitySelectorProps {
  qualities: QualityOption[];
  activeQualityId: number;
  onSelect: (qualityId: number) => void;
  /** Optional custom trigger element */
  renderTrigger?: () => React.ReactNode;
}

export function QualitySelector({
  qualities,
  activeQualityId,
  onSelect,
  renderTrigger,
}: QualitySelectorProps) {
  const [open, setOpen] = useState(false);

  if (qualities.length <= 1) return null;

  const active = qualities.find((q) => q.id === activeQualityId) ?? qualities[0];

  const trigger = renderTrigger ? (
    <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
      {renderTrigger()}
    </div>
  ) : (
    <button
      onClick={() => setOpen((v) => !v)}
      className="text-theme_1 text-xs px-2 py-1 rounded hover:bg-theme_1/10 transition-colors"
      aria-label="Quality"
      aria-expanded={open}
    >
      {active?.isAuto ? 'Auto' : (active?.label ?? 'Quality')}
    </button>
  );

  return (
    <div className="relative">
      {trigger}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-theme_1/10 rounded-lg overflow-hidden min-w-[100px] z-50">
            {qualities.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  onSelect(q.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${q.id === activeQualityId
                    ? 'text-theme_13_samecolour bg-theme_1/10'
                    : 'text-theme_1 hover:bg-theme_1/10'
                  }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
