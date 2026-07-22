import { useEffect, useState } from 'react';

/**
 * True once the page (or a given scroll container) has moved past `threshold`.
 *
 * Drives "definition on demand": a floating bar stays flat and borderless while
 * it has nothing underneath it, and only resolves into glass with a separator
 * once content is actually travelling beneath. Both iOS and macOS nav bars
 * behave this way, and a permanently drawn separator is the giveaway that a bar
 * was styled rather than designed.
 *
 * @param threshold px of scroll before the bar takes definition
 * @param target    scroll container; defaults to the window
 */
export function useScrolled(threshold = 8, target?: React.RefObject<HTMLElement>) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = target?.current;
    const read = () => (el ? el.scrollTop : window.scrollY);
    const handler = () => setScrolled(read() > threshold);

    handler(); // a reload can restore scroll position before we ever hear an event
    const node: HTMLElement | Window = el ?? window;
    node.addEventListener('scroll', handler, { passive: true });
    return () => node.removeEventListener('scroll', handler);
  }, [threshold, target]);

  return scrolled;
}

export default useScrolled;
