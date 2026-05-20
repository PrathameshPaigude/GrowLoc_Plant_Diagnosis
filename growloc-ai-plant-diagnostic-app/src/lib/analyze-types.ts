export type Detection = {
  label: string;
  color?: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
};

export type AnalyzeResult = {
  canopyHeight: number;
  canopyWidth: number;
  canopyArea: number;
  canopyHeightPx: number;
  canopyWidthPx: number;
  canopyHeightCm: number;
  canopyWidthCm: number;
  canopyAreaCm2: number;
  canopyAreaM2?: number;
  canopyAreaRawM2?: number;
  canopyAreaBiasM2?: number;
  canopyAreaZonesM2?: number[];
  canopyPixelToCm: number;
  canopyCalibrated: boolean;
  imageWidth: number;
  imageHeight: number;
  canopyDetections: Detection[];
  fruitDetections: Detection[];
  leafDetections: Detection[];
  fruitCounts: Record<string, number>;
  fruitColorCounts: Record<string, number>;
  leafCounts: Record<string, number>;
  leafColorCounts: Record<string, number>;
  leaf: {
    maskAreaRatio: number;
    detectionCount: number;
  };
  modelsStatus?: {
    canopy: boolean;
    fruit: boolean;
    leaf: boolean;
  };
};

export type AppMode = "live" | "normal" | "debug";

export type ModelSelection = {
  canopy: boolean;
  fruit: boolean;
  leaf: boolean;
};
