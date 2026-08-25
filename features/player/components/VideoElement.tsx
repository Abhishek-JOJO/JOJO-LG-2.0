"use client";

/**
 * VideoElement
 *
 * Raw <video> element with no controls.
 * Receives a ref from the parent so the engine can attach to it.
 */

import React, { forwardRef } from 'react';

interface VideoElementProps {
  className?: string;
}

export const VideoElement = forwardRef<HTMLVideoElement, VideoElementProps>(
  ({ className }, ref) => {
    return (
      <video
        ref={ref}
        className={className}
        playsInline
        preload="metadata"
        controls={false}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    );
  }
);

VideoElement.displayName = 'VideoElement';
