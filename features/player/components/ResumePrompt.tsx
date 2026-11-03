"use client";

import React, { memo, useEffect } from 'react';
import { useFocusable, setFocus, doesFocusableExist } from '@noriginmedia/norigin-spatial-navigation';

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
  children,
}: {
  focusKey: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onClick });
  // Same pair as ExitConfirmModal: one neutral resting color, orange only on focus.
  // No /opacity on theme_* colors: they are CSS vars, and Tizen's Chromium has no
  // color-mix(), so bg-theme_1/10 painted solid white under white text.
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex-1 py-3 sm:py-4 px-6 rounded-full font-bold text-sm sm:text-2xl transition-all cursor-pointer outline-none ${
        focused
          ? 'bg-theme_13_samecolour text-white scale-105 shadow-xl ring-4 ring-white z-50'
          : 'bg-neutral-800 text-white/80 hover:bg-neutral-700 hover:text-white'
      }`}
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
  // Retried until registered: the button's own useFocusable effect can commit
  // after a single 50ms timer on TV hardware, leaving focus nowhere.
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      if (doesFocusableExist('resume-btn')) {
        setFocus('resume-btn');
      } else if (++tries < 10) {
        timer = setTimeout(attempt, 80);
      }
    };
    timer = setTimeout(attempt, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[720px] mx-4 p-8 sm:p-12 flex flex-col items-center gap-8 text-center bg-theme_10 border-2 border-theme_8 rounded-xl shadow-2xl">
        <div className="space-y-4">
          <h3 className="text-[22px] sm:text-4xl font-bold text-theme_1 tracking-tight leading-snug">
            Continue Watching?
          </h3>
          <p className="text-[14px] sm:text-2xl text-theme_6 font-normal leading-relaxed">
            Resume from{' '}
            <span className="text-theme_1 font-semibold">
              {formatTime(positionSeconds)}
            </span>
          </p>
        </div>

        <div className="flex w-full items-center justify-center gap-4 mt-4">
          <ResumeChoiceBtn focusKey="resume-btn" onClick={onResume}>
            Resume
          </ResumeChoiceBtn>
          <ResumeChoiceBtn focusKey="resume-startover-btn" onClick={onStartOver}>
            Start Over
          </ResumeChoiceBtn>
        </div>
      </div>
    </div>
  );
});
