"use client";

import React, { memo, useEffect } from 'react';
import { useFocusable, setFocus } from '@noriginmedia/norigin-spatial-navigation';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ResumePromptProps {
  positionSeconds: number;
  onResume: () => void;
  onStartOver: () => void;
}

function ResumeChoiceBtn({
  focusKey,
  onClick,
  variant,
  children,
}: {
  focusKey: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onClick });
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all outline-none ${
        variant === 'primary'
          ? 'bg-theme_13_samecolour text-theme_1 hover:opacity-90'
          : 'bg-theme_1/10 text-theme_1 hover:bg-theme_1/20'
      } ${focused ? 'ring-2 ring-white scale-105 shadow-2xl' : ''}`}
    >
      {children}
    </button>
  );
}

export const ResumePrompt = memo(function ResumePrompt({
  positionSeconds,
  onResume,
  onStartOver,
}: ResumePromptProps) {
  // Mounts fresh whenever shown (parent conditionally renders this), so a
  // mount-time focus is safe — no risk of the always-mounted phantom-focusable
  // pattern that broke navigation elsewhere in the app.
  useEffect(() => {
    const timer = setTimeout(() => setFocus('resume-btn'), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-black/80 border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 text-center">
        <h3 className="text-white font-semibold text-lg mb-1">
          Continue Watching?
        </h3>
        <p className="text-theme_1/60 text-sm mb-6">
          Resume from{' '}
          <span className="text-theme_1 font-medium">
            {formatTime(positionSeconds)}
          </span>
        </p>

        <div className="flex gap-3">
          <ResumeChoiceBtn focusKey="resume-btn" onClick={onResume} variant="primary">
            Resume
          </ResumeChoiceBtn>
          <ResumeChoiceBtn focusKey="resume-startover-btn" onClick={onStartOver} variant="secondary">
            Start Over
          </ResumeChoiceBtn>
        </div>
      </div>
    </div>
  );
});
