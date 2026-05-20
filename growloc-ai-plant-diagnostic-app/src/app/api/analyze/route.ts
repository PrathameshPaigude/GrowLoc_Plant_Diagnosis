import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart body." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file field \"file\"." },
      { status: 400 },
    );
  }

  const canopyConf = formData.get("canopy_conf") ?? "0.25";
  const fruitConf = formData.get("fruit_conf") ?? "0.5";
  const leafConf = formData.get("leaf_conf") ?? "0.4";
  const canopyBias = formData.get("canopy_area_bias_m2") ?? "29.5";
  const enableCanopy = formData.get("enable_canopy") ?? "true";
  const enableFruit = formData.get("enable_fruit") ?? "true";
  const enableLeaf = formData.get("enable_leaf") ?? "true";

  const aiForm = new FormData();
  aiForm.append("file", file);
  aiForm.append("enable_canopy", String(enableCanopy));
  aiForm.append("enable_fruit", String(enableFruit));
  aiForm.append("enable_leaf", String(enableLeaf));
  aiForm.append("canopy_conf", String(canopyConf));
  aiForm.append("canopy_iou", "0.45");
  aiForm.append("canopy_area_bias_m2", String(canopyBias));
  aiForm.append("fruit_conf", String(fruitConf));
  aiForm.append("fruit_iou", "0.4");
  aiForm.append("leaf_conf", String(leafConf));

  let aiJson: AiAnalyzeResponse;
  try {
    const aiRes = await fetch("http://localhost:8001/analyze", {
      method: "POST",
      body: aiForm,
    });
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json(
        {
          error: "AI service request failed.",
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }
    aiJson = (await aiRes.json()) as AiAnalyzeResponse;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI service unreachable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

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
    return NextResponse.json(
      { error: "AI service returned invalid metrics." },
      { status: 502 },
    );
  }

  return NextResponse.json({
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
  });
}
