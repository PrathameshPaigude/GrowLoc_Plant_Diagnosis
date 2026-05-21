import { useEffect } from "react";

/** Adds `.is-visible` when elements with `.erp-reveal` enter the viewport. */
export function useScrollReveal(
  rootSelector = ".erp-app",
  deps: ReadonlyArray<unknown> = [],
) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>(".erp-reveal");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-bind when view content changes
  }, [rootSelector, ...deps]);
}
