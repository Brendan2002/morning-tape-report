import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type Origin = { x: number; y: number };

/** Bottom sheet on mobile, centered dialog on desktop. */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  origin,
  showClose,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  /** Viewport point the content came from (e.g. a tapped row); the desktop dialog scales from/to it. */
  origin?: Origin | undefined;
  /** Adds a ✕ to the mobile bottom sheet's top-right corner (the desktop dialog already has one). */
  showClose?: boolean | undefined;
}) {
  const mobile = useIsMobile();
  // Keep the last content during the exit animation so the sheet doesn't empty out while closing.
  const last = useRef({ children, title, description, origin });
  if (open) last.current = { children, title, description, origin };
  const c = last.current;

  if (mobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={c.title} description={c.description} showClose={showClose}>
        {c.children}
      </BottomSheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-xl border-0 bg-elevated sm:max-w-lg"
        style={c.origin ? { transformOrigin: `calc(${c.origin.x}px - 50vw + 50%) calc(${c.origin.y}px - 50vh + 50%)` } : undefined}
      >
        <DialogHeader>
          <DialogTitle className="group-header">{c.title}</DialogTitle>
          {c.description && <DialogDescription>{c.description}</DialogDescription>}
        </DialogHeader>
        {c.children}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Mobile bottom sheet with a critically damped spring ---------- */

const OMEGA = (2 * Math.PI) / 0.38; // ~0.38s response, zero bounce
const DISMISS_FRACTION = 0.3;
const FLICK_VELOCITY = 800; // px/s downward

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  showClose,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  showClose?: boolean | undefined;
}) {
  const [mounted, setMounted] = useState(open);
  const sheet = useRef<HTMLDivElement | null>(null);
  // Radix portals mount a tick later; track the node so enter runs once it exists.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const y = useRef(0); // current offset in px (0 = fully open)
  const raf = useRef(0);
  const releaseV = useRef(0);
  const drag = useRef<{ id: number; offset: number; samples: { t: number; y: number }[] } | null>(null);

  const height = () => sheet.current?.offsetHeight ?? window.innerHeight;

  const paint = (v: number) => {
    y.current = v;
    const h = height();
    if (sheet.current) sheet.current.style.transform = `translate3d(0, ${v}px, 0)`;
    if (overlay.current) overlay.current.style.opacity = String(Math.max(0, Math.min(1, 1 - v / h)));
  };

  /** Spring from the current position (interruptible) toward target, seeded with velocity. */
  const springTo = (target: number, v0: number, done?: () => void) => {
    cancelAnimationFrame(raf.current);
    const x0 = y.current - target;
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / 1000;
      const e = Math.exp(-OMEGA * t);
      const x = (x0 + (v0 + OMEGA * x0) * t) * e;
      const v = (v0 - OMEGA * (v0 + OMEGA * x0) * t) * e;
      if (Math.abs(x) < 0.5 && Math.abs(v) < 10) {
        paint(target);
        done?.();
        return;
      }
      paint(target + x);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const fade = (to: 0 | 1, done?: () => void) => {
    cancelAnimationFrame(raf.current);
    paint(0);
    const els = [sheet.current, overlay.current].filter(Boolean) as HTMLElement[];
    els.forEach((el) => (el.style.opacity = String(to)));
    const anims = els.map((el) => el.animate([{ opacity: 1 - to }, { opacity: to }], { duration: 200, easing: "ease-out" }));
    if (done) anims[0]?.finished.then(done, () => {});
  };

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Enter / exit
  useLayoutEffect(() => {
    if (!mounted || !node) return;
    if (open) {
      if (reducedMotion()) return fade(1);
      if (!raf.current && y.current === 0) paint(height()); // first frame: start off-screen
      springTo(0, 0);
    } else {
      const v = releaseV.current;
      releaseV.current = 0;
      const finish = () => { raf.current = 0; y.current = 0; sheet.current = null; setNode(null); setMounted(false); };
      if (reducedMotion()) fade(0, finish);
      else springTo(height(), v, finish); // exit down the same path it came up
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted, node]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || reducedMotion()) return;
    cancelAnimationFrame(raf.current); // grab mid-animation, from where it is
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, offset: e.clientY - y.current, samples: [{ t: e.timeStamp, y: y.current }] };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let next = e.clientY - d.offset;
    if (next < 0) {
      const h = height();
      next = -h * (1 - 1 / ((-next * 0.55) / h + 1)); // rubber-band above the top
    }
    paint(next);
    d.samples.push({ t: e.timeStamp, y: next });
    if (d.samples.length > 6) d.samples.shift();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const a = d.samples[0]!, b = d.samples[d.samples.length - 1]!;
    const dt = (b.t - a.t) / 1000;
    const v = dt > 0 ? (b.y - a.y) / dt : 0;
    if (y.current > height() * DISMISS_FRACTION || v > FLICK_VELOCITY) {
      releaseV.current = v;
      onOpenChange(false);
    } else {
      springTo(0, v);
    }
  };

  if (!mounted) return null;
  const handlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay forceMount ref={overlay} className="sheet-overlay fixed inset-0 z-50" style={{ opacity: 0 }} />
        <DialogPrimitive.Content
          forceMount
          ref={(el) => { sheet.current = el; setNode(el); }}
          className="material sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-xl outline-none"
          style={{ transform: "translate3d(0,100%,0)", pointerEvents: open ? "auto" : "none" }}
          aria-describedby={description ? undefined : ""}
        >
          <div {...handlers} className="touch-none select-none px-4 pb-2 pt-2">
            <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-separator" aria-hidden />
            <DialogPrimitive.Title className="group-header">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="text-[0.9375rem] text-muted-foreground">{description}</DialogPrimitive.Description>}
          </div>
          <div className="overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
