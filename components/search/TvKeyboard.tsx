"use client";

import React, { useCallback, memo } from "react";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { tvSoundManager } from "@/src/platform/audio/tvSoundManager";
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
  onBottomEdge?: () => void;
  rows?: string[][];
  keyPrefix?: string;
  className?: string;
  hideActionRow?: boolean;
}

interface LetterKeyCellProps {
  char: string;
  rowIdx: number;
  colIdx: number;
  totalRows: number;
  keyPrefix: string;
  onKeyPress: (char: string) => void;
  onRightEdge?: () => void;
  onTopEdge?: () => void;
  onBottomEdge?: () => void;
}

const LetterKeyCell = memo(function LetterKeyCell({
  char,
  rowIdx,
  colIdx,
  totalRows,
  keyPrefix,
  onKeyPress,
  onRightEdge,
  onTopEdge,
  onBottomEdge,
}: LetterKeyCellProps) {
  const focusKey = `${keyPrefix}-${rowIdx}-${colIdx}`;

  const handleClick = useCallback(() => {
    try {
      tvSoundManager.play("select");
    } catch {}
    onKeyPress(char);
  }, [onKeyPress, char]);

  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: handleClick,
    onArrowPress: (direction) => {
      try {
        tvSoundManager.play("nav");
      } catch {}
      if (direction === "right" && colIdx === 5 && onRightEdge) {
        onRightEdge();
        return false;
      }
      if (direction === "left" && colIdx === 0) {
        return false;
      }
      if (direction === "up" && rowIdx === 0 && onTopEdge) {
        onTopEdge();
        return false;
      }
      if (direction === "down" && rowIdx === totalRows - 1 && onBottomEdge) {
        onBottomEdge();
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`relative select-none flex items-center justify-center h-[46px] rounded-xl font-bold cursor-pointer transition-all ${
        focused
          ? "bg-white text-black z-30 shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-[#140a04] scale-105"
          : "bg-[#1c1c1c] text-white/90 hover:bg-[#282828] border border-white/10"
      }`}
    >
      <span className="text-lg leading-none font-extrabold">{char}</span>
      {focused && (
        <div
          className="absolute inset-0 z-40 pointer-events-none rounded-xl"
          style={{ border: "2.5px solid #ffffff" }}
        />
      )}
    </div>
  );
});

interface ActionKeyCellProps {
  focusKey: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  onRightEdge?: () => void;
  onLeftEdge?: () => void;
  onBottomEdge?: () => void;
}

const ActionKeyCell = memo(function ActionKeyCell({
  focusKey,
  label,
  icon,
  onClick,
  onRightEdge,
  onLeftEdge,
  onBottomEdge,
}: ActionKeyCellProps) {
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
      if (direction === "down" && onBottomEdge) {
        onBottomEdge();
        return false;
      }
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`relative col-span-2 select-none flex items-center justify-center h-[46px] rounded-xl font-bold cursor-pointer transition-all ${
        focused
          ? "bg-white text-black z-30 shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-[#140a04] scale-105"
          : "bg-[#1c1c1c] text-white/90 hover:bg-[#282828] border border-white/10"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      {focused && (
        <div
          className="absolute inset-0 z-40 pointer-events-none rounded-xl"
          style={{ border: "2.5px solid #ffffff" }}
        />
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
  onBottomEdge,
  rows = KEYBOARD_ROWS,
  keyPrefix = "tv-key",
  className = "",
  hideActionRow = false,
}: TvKeyboardProps) {
  const handleSpace = useCallback(() => {
    onKeyPress(" ");
  }, [onKeyPress]);

  return (
    <div className={`w-full select-none bg-[#161616]/90 border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 ${className}`}>
      {/* 6-Column Matrix */}
      <div className="grid grid-cols-6 gap-2">
        {rows.map((row, rowIdx) =>
          row.map((char, colIdx) => (
            <LetterKeyCell
              key={`${keyPrefix}-${rowIdx}-${colIdx}`}
              char={char}
              rowIdx={rowIdx}
              colIdx={colIdx}
              totalRows={rows.length}
              keyPrefix={keyPrefix}
              onKeyPress={onKeyPress}
              onRightEdge={onRightEdge}
              onTopEdge={onTopEdge}
              onBottomEdge={hideActionRow ? onBottomEdge : undefined}
            />
          ))
        )}
      </div>

      {/* Action Row: SPACE (col-span-2), BACKSPACE (col-span-2), CLEAR (col-span-2) */}
      {!hideActionRow && (
        <div className="grid grid-cols-6 gap-2 pt-1 border-t border-white/10">
          <ActionKeyCell
            focusKey={`${keyPrefix}-space`}
            label="Space"
            icon={<Space className="w-4 h-4" />}
            onClick={handleSpace}
            onLeftEdge={() => {}}
            onBottomEdge={onBottomEdge}
          />
          <ActionKeyCell
            focusKey={`${keyPrefix}-backspace`}
            label="Delete"
            icon={<Delete className="w-4 h-4" />}
            onClick={onBackspace}
            onBottomEdge={onBottomEdge}
          />
          <ActionKeyCell
            focusKey={`${keyPrefix}-clear`}
            label="Clear"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onClear}
            onRightEdge={onRightEdge}
            onBottomEdge={onBottomEdge}
          />
        </div>
      )}
    </div>
  );
});
