import { useEffect } from "react";

/** Growloc-style page bg: white at top → subtle light green after scroll (home view). */
export function useMonitorScrollBg(active: boolean, threshold = 100) {
  useEffect(() => {
    const root = document.documentElement;

    if (!active) {
      root.classList.remove("erp-scroll-green");
      return;
    }

    const onScroll = () => {
      root.classList.toggle("erp-scroll-green", window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("erp-scroll-green");
    };
  }, [active, threshold]);
}
