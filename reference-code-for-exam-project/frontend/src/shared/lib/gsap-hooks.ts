
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useReducedMotion(): boolean {
  const ref = useRef<boolean>(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return ref.current;
}

/** Staggered hero reveal — eyebrow → title → copy → CTA, once on load. */
export function useHeroStagger<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) {
      if (el) el.querySelectorAll<HTMLElement>("[data-hero-step]").forEach((n) => {
        n.style.opacity = "1"; n.style.transform = "none";
      });
      return;
    }
    const steps = el.querySelectorAll<HTMLElement>("[data-hero-step]");
    gsap.set(steps, { opacity: 0, y: 24 });
    const tween = gsap.to(steps, {
      opacity: 1, y: 0, duration: 0.65, ease: "power3.out", stagger: 0.09, overwrite: true,
    });
    return () => { tween.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Single-direction scroll reveals: fade + rise, one duration, no scrubbing. */
export function useScrollReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) {
      if (el) el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((n) => {
        n.style.opacity = "1"; n.style.transform = "none"; n.setAttribute("data-revealed", "true");
      });
      return;
    }
    const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
    gsap.set(items, { opacity: 0, y: 22 });
    const triggers: ScrollTrigger[] = [];
    items.forEach((item) => {
      const tween = gsap.to(item, {
        opacity: 1, y: 0, duration: 0.6, ease: "power3.out",
        scrollTrigger: {
          trigger: item,
          start: "top 88%",
          toggleActions: "play none none reverse",
          onEnter: () => item.setAttribute("data-revealed", "true"),
        },
      });
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    });
    return () => { triggers.forEach((t) => t.kill()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
