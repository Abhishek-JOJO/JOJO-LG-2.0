import { RefObject, useEffect, useRef, useState } from "react";

interface Options extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: Options = {}
): [RefObject<T | null>, boolean] {
  const { triggerOnce = false, ...observerOptions } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && triggerOnce) observer.disconnect();
    }, observerOptions);

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerOnce]);

  return [ref, isIntersecting];
}
