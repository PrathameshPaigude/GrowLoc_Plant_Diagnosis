import type { AnalyzeResult } from "@/lib/analyze-types";
import { BACKEND_URL } from "@/lib/config";

type AiAnalyzeResponse = {
  canopy_height: number;
  canopy_width: number;
  canopy_area: number;
  canopy_height_px?: number;
  canopy_width_px?: number;
  canopy_height_cm?: number;
  canopy_width_cm?: number;
  canopy_area_cm2?: number;
  canopy_area_m2?: number;
  canopy_area_raw_m2?: number;
  canopy_area_bias_m2?: number;
  canopy_area_zones_m2?: number[];
  canopy_pixel_to_cm?: number;
  canopy_calibrated?: boolean;
  image_width?: number;
  image_height?: number;
  canopy_detections?: Array<{
    label: string;
    color?: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
  fruit_detections?: Array<{
    label: string;
    color?: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
  leaf_detections?: Array<{
    label: string;
    color?: string;
    confidence: number;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }>;
  fruit_counts?: Record<string, number>;
  fruit_color_counts?: Record<string, number>;
  leaf_counts?: Record<string, number>;
  leaf_color_counts?: Record<string, number>;
  leaf?: {
    mask_area_ratio?: number;
    detection_count?: number;
  };
  models_status?: {
    canopy?: boolean;
    fruit?: boolean;
    leaf?: boolean;
  };
};

export type AnalyzeParams = {
  file: File;
  enableCanopy: boolean;
  enableFruit: boolean;
  enableLeaf: boolean;
  canopyConf: number;
  canopyBias: number;
  fruitConf: number;
  leafConf: number;
};

export class AnalyzeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AnalyzeError";
  }
}

function transformResponse(aiJson: AiAnalyzeResponse): AnalyzeResult {
  const canopyAreaM2 = Number(
    aiJson.canopy_area_m2 ?? (aiJson.canopy_area_cm2 ?? 0) / 10_000,
  );
  const canopyHeight = Number(aiJson.canopy_height_cm ?? aiJson.canopy_height);
  const canopyWidth = Number(aiJson.canopy_width_cm ?? aiJson.canopy_width);

  if (
    !Number.isFinite(canopyHeight) ||
    !Number.isFinite(canopyWidth) ||
    !Number.isFinite(canopyAreaM2)
  ) {
    throw new AnalyzeError("AI service returned invalid metrics.", 502);
  }

  return {
    canopyHeight,
    canopyWidth,
    canopyArea: canopyAreaM2,
    canopyHeightPx: Number(aiJson.canopy_height_px ?? 0),
    canopyWidthPx: Number(aiJson.canopy_width_px ?? 0),
    canopyHeightCm: canopyHeight,
    canopyWidthCm: canopyWidth,
    canopyAreaCm2: Number(aiJson.canopy_area_cm2 ?? canopyAreaM2 * 10_000),
    canopyAreaM2,
    canopyAreaRawM2: Number(aiJson.canopy_area_raw_m2 ?? 0),
    canopyAreaBiasM2: Number(aiJson.canopy_area_bias_m2 ?? 0),
    canopyAreaZonesM2: aiJson.canopy_area_zones_m2 ?? [],
    canopyPixelToCm: Number(aiJson.canopy_pixel_to_cm ?? 1),
    canopyCalibrated: Boolean(aiJson.canopy_calibrated ?? false),
    canopyDetections: aiJson.canopy_detections ?? [],
    fruitDetections: aiJson.fruit_detections ?? [],
    leafDetections: aiJson.leaf_detections ?? [],
    fruitCounts: aiJson.fruit_counts ?? {},
    fruitColorCounts: aiJson.fruit_color_counts ?? {},
    leafCounts: aiJson.leaf_counts ?? {},
    leafColorCounts: aiJson.leaf_color_counts ?? {},
    imageWidth: Number(aiJson.image_width ?? 0),
    imageHeight: Number(aiJson.image_height ?? 0),
    leaf: {
      maskAreaRatio: Number(aiJson.leaf?.mask_area_ratio ?? 0),
      detectionCount: Number(aiJson.leaf?.detection_count ?? 0),
    },
    modelsStatus: {
      canopy: Boolean(aiJson.models_status?.canopy ?? false),
      fruit: Boolean(aiJson.models_status?.fruit ?? false),
      leaf: Boolean(aiJson.models_status?.leaf ?? false),
    },
  };
}

/** Calls FastAPI /analyze and maps the response to frontend AnalyzeResult. */
export async function analyzeImage(params: AnalyzeParams): Promise<AnalyzeResult> {
  const aiForm = new FormData();
  aiForm.append("file", params.file);
  aiForm.append("enable_canopy", String(params.enableCanopy));
  aiForm.append("enable_fruit", String(params.enableFruit));
  aiForm.append("enable_leaf", String(params.enableLeaf));
  aiForm.append("canopy_conf", String(params.canopyConf));
  aiForm.append("canopy_iou", "0.45");
  aiForm.append("canopy_area_bias_m2", String(params.canopyBias));
  aiForm.append("fruit_conf", String(params.fruitConf));
  aiForm.append("fruit_iou", "0.4");
  aiForm.append("leaf_conf", String(params.leafConf));

  let aiRes: Response;
  try {
    aiRes = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      body: aiForm,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI service unreachable.";
    throw new AnalyzeError(message, 502);
  }

  if (!aiRes.ok) {
    const text = await aiRes.text();
    throw new AnalyzeError(
      "AI service request failed.",
      aiRes.status,
      text.slice(0, 500),
    );
  }

  const aiJson = (await aiRes.json()) as AiAnalyzeResponse;
  return transformResponse(aiJson);
}
