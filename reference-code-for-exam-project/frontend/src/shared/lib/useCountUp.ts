
import { useEffect, useState } from "react";
import gsap from "gsap";

export function useCountUp(value: number, duration = 0.9): number {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(value); return; }
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: value, duration, ease: "power2.out", overwrite: true,
      onUpdate: () => setDisplay(Math.round(obj.n)),
      onComplete: () => setDisplay(value),
    });
    return () => { tween.kill(); };
  }, [value, duration]);
  return display;
}
