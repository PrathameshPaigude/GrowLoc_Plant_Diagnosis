"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { Detection } from "@/lib/analyze-types";

/* ── Confidence slider ─────────────────────────────────────────────────── */
export function ConfidenceSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${color}`}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={5}
        max={95}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-current"
        style={{ accentColor: color.includes("emerald") ? "#10b981" : color.includes("amber") ? "#f59e0b" : "#06b6d4" }}
      />
    </div>
  );
}

type ImageLayout = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

function useObjectContainLayout(
  containerRef: React.RefObject<HTMLDivElement | null>,
  imgRef: React.RefObject<HTMLImageElement | null>,
  naturalWidth: number,
  naturalHeight: number,
  imageUrl: string,
): ImageLayout {
  const [layout, setLayout] = useState<ImageLayout>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container || naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const imageAspect = naturalWidth / naturalHeight;
      const containerAspect = cw / ch;

      let displayW: number;
      let displayH: number;
      let offsetX: number;
      let offsetY: number;

      if (imageAspect > containerAspect) {
        displayW = cw;
        displayH = cw / imageAspect;
        offsetX = 0;
        offsetY = (ch - displayH) / 2;
      } else {
        displayH = ch;
        displayW = ch * imageAspect;
        offsetX = (cw - displayW) / 2;
        offsetY = 0;
      }

      setLayout({
        offsetX,
        offsetY,
        scale: displayW / naturalWidth,
      });
    };

    update();
    const img = imgRef.current;
    img?.addEventListener("load", update);
    const observer = new ResizeObserver(update);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      img?.removeEventListener("load", update);
      observer.disconnect();
    };
  }, [containerRef, imgRef, naturalWidth, naturalHeight, imageUrl]);

  return layout;
}

export function OverlayPreview({
  imageUrl,
  detections,
  imageWidth,
  imageHeight,
  colorClass,
}: {
  imageUrl: string;
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  colorClass: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const layout = useObjectContainLayout(
    containerRef,
    imgRef,
    imageWidth,
    imageHeight,
    imageUrl,
  );

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Model output overlay"
        className="size-full object-contain"
      />
      <div className="pointer-events-none absolute inset-0">
        {detections.map((det, idx) => {
          const left = layout.offsetX + det.bbox.x1 * layout.scale;
          const top = layout.offsetY + det.bbox.y1 * layout.scale;
          const width = (det.bbox.x2 - det.bbox.x1) * layout.scale;
          const height = (det.bbox.y2 - det.bbox.y1) * layout.scale;
          return (
            <div
              key={`${det.label}-${idx}`}
              className={`absolute border-2 ${colorClass}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${Math.max(0, width)}px`,
                height: `${Math.max(0, height)}px`,
              }}
            >
              <span className="bg-background/80 px-1 text-[10px] font-medium">
                {det.label}
                {det.color ? ` • ${det.color}` : ""}{" "}
                {(det.confidence * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DetectionChips({ detections }: { detections: Detection[] }) {
  if (!detections.length) {
    return (
      <p className="text-muted-foreground text-xs">No detections for this model.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {detections.slice(0, 12).map((det, idx) => (
        <span
          key={`${det.label}-${idx}`}
          className="rounded-full border bg-background px-2 py-1 text-xs"
        >
          {det.label}
          {det.color ? ` • ${det.color}` : ""} {(det.confidence * 100).toFixed(1)}%
        </span>
      ))}
      {detections.length > 12 ? (
        <span className="rounded-full border bg-muted px-2 py-1 text-xs">
          +{detections.length - 12} more
        </span>
      ) : null}
    </div>
  );
}
