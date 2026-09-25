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

interface LetterKeyCellProps {
  char: string;
  rowIdx: number;
  colIdx: number;
  onKeyPress: (char: string) => void;
  onRightEdge?: () => void;
  onTopEdge?: () => void;
}

const LetterKeyCell = memo(function LetterKeyCell({
  char,
  rowIdx,
  colIdx,
  onKeyPress,
  onRightEdge,
  onTopEdge,
}: LetterKeyCellProps) {
  const focusKey = `tv-key-${rowIdx}-${colIdx}`;

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
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`relative select-none flex items-center justify-center h-[50px] rounded-xl font-bold cursor-pointer ${
        focused
          ? "bg-white text-black z-30 shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-[#140a04]"
          : "bg-[#1c1c1c] text-white/90 hover:bg-[#282828] border border-white/10"
      }`}
    >
      <span className="text-xl leading-none font-extrabold">{char}</span>
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
}

const ActionKeyCell = memo(function ActionKeyCell({
  focusKey,
  label,
  icon,
  onClick,
  onRightEdge,
  onLeftEdge,
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
      return true;
    },
  });

  return (
    <div
      ref={ref as any}
      data-focuskey={focusKey}
      onClick={handleClick}
      className={`relative col-span-2 select-none flex items-center justify-center h-[50px] rounded-xl font-bold cursor-pointer ${
        focused
          ? "bg-white text-black z-30 shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-[#140a04]"
          : "bg-[#1c1c1c] text-white/90 hover:bg-[#282828] border border-white/10"
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider">
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
}: TvKeyboardProps) {
  const handleSpace = useCallback(() => {
    onKeyPress(" ");
  }, [onKeyPress]);

  return (
    <div className="w-full select-none bg-[#161616] border border-white/10 rounded-xl p-3.5 shadow-lg flex flex-col gap-2.5">
      {/* 6x6 Matrix for Letters & Numbers */}
      <div className="grid grid-cols-6 gap-2.5">
        {KEYBOARD_ROWS.map((row, rowIdx) =>
          row.map((char, colIdx) => (
            <LetterKeyCell
              key={`key-${rowIdx}-${colIdx}`}
              char={char}
              rowIdx={rowIdx}
              colIdx={colIdx}
              onKeyPress={onKeyPress}
              onRightEdge={onRightEdge}
              onTopEdge={onTopEdge}
            />
          ))
        )}
      </div>

      {/* Action Row: SPACE (col-span-2), BACKSPACE (col-span-2), CLEAR (col-span-2) */}
      <div className="grid grid-cols-6 gap-2 pt-1 border-t border-white/10">
        <ActionKeyCell
          focusKey="tv-key-space"
          label="Space"
          icon={<Space className="w-4 h-4" />}
          onClick={handleSpace}
          onLeftEdge={() => {}}
        />
        <ActionKeyCell
          focusKey="tv-key-backspace"
          label="Delete"
          icon={<Delete className="w-4 h-4" />}
          onClick={onBackspace}
        />
        <ActionKeyCell
          focusKey="tv-key-clear"
          label="Clear"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onClear}
          onRightEdge={onRightEdge}
        />
      </div>
    </div>
  );
});
