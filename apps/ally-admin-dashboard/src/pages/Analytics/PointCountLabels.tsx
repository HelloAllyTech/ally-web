import { ReactNode, useLayoutEffect, useRef, useState } from "react";

type Label = { left: number; top: number; text: string };

/**
 * Prints a small number beside every point of a Carbon line chart — the sample
 * size behind each plotted value — without adding a series for it.
 *
 * Carbon has no data-label option for line charts, so this reads the rendered
 * `circle.dot` elements, takes each one's position and the datum d3 bound to it,
 * and lays an absolutely-positioned label over the plot. It re-measures whenever
 * Carbon re-renders (a mutation under the wrapper) or the plot resizes. Pass
 * `animations: false` to the chart: mid-transition dots report stale positions.
 *
 * The labels are `aria-hidden`; the same numbers must be available as text
 * elsewhere (the detail table), since a screen reader cannot place them.
 */
export const PointCountLabels = ({
  countOf,
  above,
  children,
}: {
  /** The label for a plotted datum, or null to print nothing beside it. */
  countOf: (datum: Record<string, unknown>) => string | null;
  /** Whether a datum's label sits above its point (default) or below it. */
  above?: (datum: Record<string, unknown>) => boolean;
  children: ReactNode;
}) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  // Held in refs so a new closure each render doesn't re-subscribe the observers.
  const countRef = useRef(countOf);
  const aboveRef = useRef(above);
  countRef.current = countOf;
  aboveRef.current = above;

  useLayoutEffect(() => {
    const el = wrapper.current;
    if (!el) return undefined;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = el.getBoundingClientRect();
        const next: Label[] = [];
        el.querySelectorAll<SVGCircleElement>("circle.dot").forEach(dot => {
          const datum = (dot as unknown as { __data__?: Record<string, unknown> }).__data__;
          if (!datum) return;
          const text = countRef.current(datum);
          if (text === null) return;
          const box = dot.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) return;
          const isAbove = aboveRef.current ? aboveRef.current(datum) : true;
          next.push({
            left: box.left + box.width / 2 - origin.left,
            top: isAbove ? box.top - origin.top - 16 : box.bottom - origin.top + 2,
            text,
          });
        });
        setLabels(prev =>
          prev.length === next.length &&
          prev.every(
            (p, i) => p.left === next[i].left && p.top === next[i].top && p.text === next[i].text,
          )
            ? prev
            : next,
        );
      });
    };
    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["cx", "cy"],
    });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapper} className="relative">
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {labels.map((l, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 whitespace-nowrap text-xs text-typography-500"
            style={{ left: l.left, top: l.top }}
          >
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
};
