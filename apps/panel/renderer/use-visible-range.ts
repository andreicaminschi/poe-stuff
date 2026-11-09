import { useLayoutEffect, useRef, useState } from "react";

const OVERSCAN = 10;

/** The rows a scroll box shows, for rows of one fixed height. */
export function useVisibleRange(rowHeight: number, count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const box = ref.current;
    if (box === null) return undefined;
    const onScroll = (): void => setScrollTop(box.scrollTop);
    const observer = new ResizeObserver(() => setHeight(box.clientHeight));
    box.addEventListener("scroll", onScroll);
    observer.observe(box);
    setHeight(box.clientHeight);
    return () => {
      box.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(count, Math.ceil((scrollTop + height) / rowHeight) + OVERSCAN);
  return { ref, start, end };
}
