import type { AnalyzeResult } from "@/lib/analyze-types";

type Layer = {
  detections: AnalyzeResult["canopyDetections"];
  stroke: string;
  label: string;
};

const PANEL_PADDING_X = 16;
const PANEL_TITLE_SIZE = 22;
const PANEL_LINE_SIZE = 16;
const PANEL_LINE_HEIGHT = 24;
const PANEL_TITLE_BLOCK = 44;
const PANEL_BOTTOM_PAD = 16;

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  for (const token of tokens) {
    const candidate = current ? `${current}${token}` : token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();

    if (ctx.measureText(token.trim() || token).width <= maxWidth) {
      current = token.trim() ? token : token;
      continue;
    }

    let chunk = "";
    for (const char of token.trim() || token) {
      const next = chunk + char;
      if (ctx.measureText(next).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  }

  flush();
  return lines.length > 0 ? lines : [text];
}

export async function buildCompositeImage(
  imageUrl: string,
  result: AnalyzeResult,
  enabled: { canopy: boolean; fruit: boolean; leaf: boolean },
): Promise<string> {
  const img = await loadImage(imageUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  const summaryLines: string[] = [];
  if (enabled.canopy) {
    summaryLines.push(
      `Canopy: ${result.canopyDetections.length} plants | area ${(result.canopyAreaM2 ?? result.canopyAreaCm2 / 10_000).toFixed(1)} m²`,
    );
  }
  if (enabled.fruit) {
    const parts = Object.entries(result.fruitCounts)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    summaryLines.push(
      `Fruit: ${result.fruitDetections.length} total${parts ? ` (${parts})` : ""}`,
    );
  }
  if (enabled.leaf) {
    const parts = Object.entries(result.leafColorCounts)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    summaryLines.push(
      `Leaves: ${result.leaf.detectionCount} | mask ratio ${result.leaf.maskAreaRatio.toFixed(3)}`,
    );
    if (parts) {
      summaryLines.push(parts);
    }
  }

  const textMaxWidth = Math.max(120, w - PANEL_PADDING_X * 2);
  ctx.font = `${PANEL_LINE_SIZE}px sans-serif`;
  const wrappedSummary = summaryLines.flatMap((line) =>
    wrapCanvasText(ctx, line, textMaxWidth),
  );
  const panelH = Math.max(
    120,
    PANEL_TITLE_BLOCK + wrappedSummary.length * PANEL_LINE_HEIGHT + PANEL_BOTTOM_PAD,
  );

  canvas.width = w;
  canvas.height = h + panelH;

  ctx.drawImage(img, 0, 0, w, h);

  const layers: Layer[] = [];
  if (enabled.canopy) {
    layers.push({
      detections: result.canopyDetections,
      stroke: "#10b981",
      label: "Canopy",
    });
  }
  if (enabled.fruit) {
    layers.push({
      detections: result.fruitDetections,
      stroke: "#f59e0b",
      label: "Fruit",
    });
  }
  if (enabled.leaf) {
    layers.push({
      detections: result.leafDetections,
      stroke: "#06b6d4",
      label: "Leaf",
    });
  }

  for (const layer of layers) {
    for (const det of layer.detections) {
      const { x1, y1, x2, y2 } = det.bbox;
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = Math.max(2, Math.round(w / 400));
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const tag = `${det.label}${det.color ? `/${det.color}` : ""} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = `${Math.max(12, Math.round(w / 50))}px sans-serif`;
      ctx.fillStyle = layer.stroke;
      ctx.fillRect(x1, Math.max(0, y1 - 18), ctx.measureText(tag).width + 8, 18);
      ctx.fillStyle = "#000";
      ctx.fillText(tag, x1 + 4, Math.max(12, y1 - 5));
    }
  }

  const isLightTheme = !document.documentElement.classList.contains("dark");
  const panelBg = isLightTheme ? "#f7fcf9" : "#1a2420";
  const panelTitleColor = isLightTheme ? "#005755" : "#e2e8f0";
  const panelTextColor = isLightTheme ? "#334155" : "#cbd5e1";

  ctx.fillStyle = panelBg;
  ctx.fillRect(0, h, w, panelH);
  ctx.fillStyle = panelTitleColor;
  ctx.font = `bold ${PANEL_TITLE_SIZE}px sans-serif`;
  ctx.fillText("Growloc — Combined Summary", PANEL_PADDING_X, h + 32);

  ctx.fillStyle = panelTextColor;
  ctx.font = `${PANEL_LINE_SIZE}px sans-serif`;
  wrappedSummary.forEach((line, i) => {
    ctx.fillText(line, PANEL_PADDING_X, h + PANEL_TITLE_BLOCK + 20 + i * PANEL_LINE_HEIGHT);
  });

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}
