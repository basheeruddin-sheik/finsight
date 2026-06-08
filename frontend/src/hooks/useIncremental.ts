import { useEffect, useRef, useState } from 'react';

// Infinite scroll: render `step` items, then auto-grow by `step` whenever the
// sentinel (placed at the end of the list) scrolls into view. Resets when the
// underlying list size changes (e.g. filters change).
export function useIncremental(total: number, step = 10) {
  const [count, setCount] = useState(step);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCount(step); }, [total, step]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || count >= total) return;
    const io = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setCount(c => Math.min(c + step, total)); },
      { rootMargin: '240px' }, // start loading a bit before it's visible
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, total, step]);

  return { count, sentinelRef };
}
