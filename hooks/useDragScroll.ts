import { useEffect, useRef, useState } from "react";

export function useDragScroll(externalRef?: React.RefObject<HTMLDivElement | null>) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const ref = externalRef || localRef;
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasMoved = false;

    // Momentum/Inertia tracking variables
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let rafId: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag on left-click
      if (e.button !== 0) return;

      isDown = true;
      startX = e.clientX;
      startScrollLeft = element.scrollLeft;
      hasMoved = false;

      lastX = e.clientX;
      lastTime = performance.now();
      velocity = 0;

      // Cancel any running deceleration animation on new click
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Temporarily disable smooth scroll during dragging
      element.style.scrollBehavior = "auto";
      setIsDragging(true);

      // Register window events to track mouse movement outside the list boundary
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUpOrLeave);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;

      const x = e.clientX;
      const walk = x - startX;

      if (Math.abs(walk) > 5) {
        hasMoved = true;
      }

      element.scrollLeft = startScrollLeft - walk;

      // Track velocity
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        const dx = x - lastX;
        const instantVelocity = dx / dt;
        // Smooth out velocity with an exponential filter
        velocity = velocity * 0.3 + instantVelocity * 0.7;
      }
      lastX = x;
      lastTime = now;
    };

    const handleMouseUpOrLeave = () => {
      if (!isDown) return;
      isDown = false;
      setIsDragging(false);

      // Remove window events since we stopped dragging
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUpOrLeave);

      // Start momentum/inertial scrolling
      const timeElapsedSinceLastMove = performance.now() - lastTime;
      if (timeElapsedSinceLastMove < 100 && Math.abs(velocity) > 0.1) {
        let speed = -velocity * 16.666; // pixels per frame (assuming 60fps/16.6ms)

        // Limit maximum scroll speed to avoid extreme scrolling
        const maxSpeed = 120;
        if (speed > maxSpeed) speed = maxSpeed;
        if (speed < -maxSpeed) speed = -maxSpeed;

        const decay = 0.955; // friction factor (higher = slides further)
        let lastFrameTime = performance.now();

        const step = (timestamp: number) => {
          if (!rafId) return;

          const dt = Math.max(0, timestamp - lastFrameTime);
          lastFrameTime = timestamp;

          // Cap dt to avoid huge jumps on frame drops
          const clampedDt = Math.min(dt, 50);

          if (Math.abs(speed) < 0.5) {
            rafId = null;
            element.style.scrollBehavior = ""; // restore scroll-smooth class behavior
            return;
          }

          const timeRatio = clampedDt / 16.666;
          element.scrollLeft += speed * timeRatio;
          speed *= Math.pow(decay, timeRatio);

          rafId = requestAnimationFrame(step);
        };

        rafId = requestAnimationFrame(step);
      } else {
        element.style.scrollBehavior = ""; // restore scroll-smooth class behavior
      }

      // Keep hasMoved true for a brief instant to intercept the click event
      setTimeout(() => {
        hasMoved = false;
      }, 50);
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("click", handleClickCapture, true); // capture phase

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("click", handleClickCapture, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUpOrLeave);
    };
  }, [ref]);

  return { ref, isDragging };
}
