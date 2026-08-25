"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { JOJOCustomButton } from "./JOJOButton";

interface PortalProps {
  children: React.ReactNode;
  elementId?: string;
}

export function Portal({ children, elementId = "jojo-portal-root" }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let portalElement = document.getElementById(elementId);
    let created = false;

    if (!portalElement) {
      portalElement = document.createElement("div");
      portalElement.id = elementId;
      document.body.appendChild(portalElement);
      created = true;
    }

    setContainer(portalElement);

    return () => {
      if (created && portalElement && document.body.contains(portalElement)) {
        document.body.removeChild(portalElement);
      }
    };
  }, [elementId]);

  if (!container) return null;

  return createPortal(children, container);
}

interface JOJOModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  showCloseButton?: boolean;
  style?: React.CSSProperties;
}

import { useFocusable } from "@noriginmedia/norigin-spatial-navigation";

function FocusableCloseButton({ onClick }: { onClick: () => void }) {
  const { ref, focused } = useFocusable({
    focusable: true,
    onEnterPress: onClick
  });

  return (
    <JOJOCustomButton
      ref={ref}
      type="button"
      onClick={onClick}
      className={`absolute top-5 right-5 p-1.5 rounded-full text-[#a3a3a3] hover:text-theme_1 hover:bg-theme_1/5 transition-colors cursor-pointer focus:outline-none ${focused ? 'ring-2 ring-offset-2 ring-offset-[#1a1a1a] ring-theme_13_samecolour scale-110' : ''}`}
      aria-label="Close modal"
    >
      <X className="w-5 h-5" />
    </JOJOCustomButton>
  );
}

export function JOJOModal({
  isOpen,
  onClose,
  children,
  className,
  backdropClassName,
  showCloseButton = false,
  style,
}: JOJOModalProps) {

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Backdrop Overlay */}
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={cn("absolute inset-0 bg-black/60 backdrop-blur-md", backdropClassName)}
            />

            {/* Modal Dialog Content Card */}
            <motion.div
              key="modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              style={style}
              className={cn(
                "relative z-10 w-full max-w-[520px] bg-theme_10 border-[2px] border-theme_8 rounded-xl shadow-2xl p-8 sm:p-10 flex flex-col items-center text-center gap-6",
                className
              )}
            >
              {showCloseButton && (
                <FocusableCloseButton onClick={onClose} />
              )}

              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
