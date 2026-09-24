"use client";

import React, { useCallback, memo } from "react";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { tvSoundManager } from "@/lib/webos/tvSoundManager";
import { Delete, RotateCcw, Space } from "lucide-react";

// ── Standard OTT TV 6-Column Grid Layout (Netflix / Hotstar / Prime pattern) ──
const KEYBOARD_ROWS = [
  ["A", "B", "C", "D", "E", "F"],
  ["G", "H", "I", "J", "K", "L"],
  ["M", "N", "O", "P", "Q", "R"],
  ["S", "T", "U", "V", "W", "X"],
  ["Y", "Z", "1", "2", "3", "4"],
  ["5", "6", "7", "8", "9", "0"],
];

interface TvKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onRightEdge?: () => void;
  onTopEdge?: () => void;
}

interface KeyCellProps {
  focusKey: string;
  label?: string;
  icon?: React.ReactNode;
  colSpan?: number;
  onClick: () => void;
  onRightEdge?: () => void;
  onLeftEdge?: () => void;
  onTopEdge?: () => void;
  className?: string;
}

const KeyCell = memo(function KeyCell({
  focusKey,
  label,
  icon,
  colSpan = 1,
  onClick,
  onRightEdge,
  onLeftEdge,
  onTopEdge,
  className = "",
}: KeyCellProps) {
  const handleClick = useCallback(() => {
    try {
      tvSoundManager.play("select");
    } catch {}
    onClick();
  }, [onClick]);

  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: handleClick,
    onArrowPress: (direction) => {
      try {
        tvSoundManager.play("nav");
      } catch {}
      if (direction === "right" && onRightEdge) {
        onRightEdge();
        return false;
      }
      if (direction === "left" && onLeftEdge) {
        onLeftEdge();
        return false;
      }
      if (direction === "up" && onTopEdge) {
        onTopEdge();
        return false;
      }
      return true;
    },
  });

  const spanClass =
    colSpan === 2
      ? "col-span-2"
      : colSpan === 3
      ? "col-span-3"
      : colSpan === 4
      ? "col-span-4"
      : "col-span-1";

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`relative select-none flex items-center justify-center h-[46px] rounded-xl font-bold cursor-pointer transition-transform duration-75 ${spanClass} ${
        focused
          ? "bg-white text-black scale-105 z-20 shadow-xl ring-2 ring-white"
          : "bg-[#1c1c1c] text-white/90 hover:bg-[#282828] border border-white/5"
      } ${className}`}
    >
      {icon ? (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          {icon}
          {label && <span>{label}</span>}
        </div>
      ) : (
        <span className="text-base leading-none">{label}</span>
      )}
    </div>
  );
});

export const TvKeyboard = memo(function TvKeyboard({
  onKeyPress,
  onBackspace,
  onClear,
  onRightEdge,
  onTopEdge,
}: TvKeyboardProps) {
  const handleRight = useCallback(() => {
    if (onRightEdge) {
      onRightEdge();
    } else if (doesFocusableExist("search-input")) {
      setFocus("search-input");
    }
  }, [onRightEdge]);

  const handleLeft = useCallback(() => {
    // Stay inside keyboard
    return;
  }, []);

  const handleTopEdge = useCallback(() => {
    if (onTopEdge) {
      onTopEdge();
    }
  }, [onTopEdge]);

  const handleKeyPress = useCallback(
    (char: string) => {
      onKeyPress(char);
    },
    [onKeyPress]
  );

  return (
    <div className="w-full select-none bg-[#111111]/95 border border-white/10 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2">
      {/* 6x6 Matrix for Letters & Numbers */}
      <div className="grid grid-cols-6 gap-2">
        {KEYBOARD_ROWS.map((row, rowIdx) =>
          row.map((char, colIdx) => (
            <KeyCell
              key={`key-${rowIdx}-${colIdx}`}
              focusKey={`tv-key-${rowIdx}-${colIdx}`}
              label={char}
              onClick={() => handleKeyPress(char)}
              onRightEdge={colIdx === 5 ? handleRight : undefined}
              onLeftEdge={colIdx === 0 ? handleLeft : undefined}
              onTopEdge={rowIdx === 0 ? handleTopEdge : undefined}
            />
          ))
        )}
      </div>

      {/* Action Row: SPACE (col-span-2), BACKSPACE (col-span-2), CLEAR (col-span-2) */}
      <div className="grid grid-cols-6 gap-2 pt-1 border-t border-white/10">
        <KeyCell
          focusKey="tv-key-space"
          label="Space"
          icon={<Space className="w-4 h-4" />}
          colSpan={2}
          onClick={() => handleKeyPress(" ")}
          onLeftEdge={handleLeft}
        />
        <KeyCell
          focusKey="tv-key-backspace"
          label="Delete"
          icon={<Delete className="w-4 h-4" />}
          colSpan={2}
          onClick={onBackspace}
        />
        <KeyCell
          focusKey="tv-key-clear"
          label="Clear"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          colSpan={2}
          onClick={onClear}
          onRightEdge={handleRight}
        />
      </div>
    </div>
  );
});
