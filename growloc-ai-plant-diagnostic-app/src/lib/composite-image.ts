import type { AnalyzeResult } from "@/lib/analyze-types";

type Layer = {
  detections: AnalyzeResult["canopyDetections"];
  stroke: string;
  label: string;
};

export async function buildCompositeImage(
  imageUrl: string,
  result: AnalyzeResult,
  enabled: { canopy: boolean; fruit: boolean; leaf: boolean },
): Promise<string> {
  const img = await loadImage(imageUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const panelH = 220;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + panelH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

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

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, h, w, panelH);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Growloc — Combined Summary", 16, h + 32);

  const lines: string[] = [];
  if (enabled.canopy) {
    lines.push(
      `Canopy: ${result.canopyDetections.length} plants | area ${(result.canopyAreaM2 ?? result.canopyAreaCm2 / 10_000).toFixed(1)} m²`,
    );
  }
  if (enabled.fruit) {
    const parts = Object.entries(result.fruitCounts)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    lines.push(
      `Fruit: ${result.fruitDetections.length} total${parts ? ` (${parts})` : ""}`,
    );
  }
  if (enabled.leaf) {
    const parts = Object.entries(result.leafColorCounts)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    lines.push(
      `Leaves: ${result.leaf.detectionCount} | mask ratio ${result.leaf.maskAreaRatio.toFixed(3)}${parts ? ` | ${parts}` : ""}`,
    );
  }

  ctx.font = "16px sans-serif";
  lines.forEach((line, i) => {
    ctx.fillText(line, 16, h + 64 + i * 26);
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
