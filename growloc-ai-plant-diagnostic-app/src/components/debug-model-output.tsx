import { Apple, Leaf } from "lucide-react";

import type { AnalyzeResult } from "@/lib/analyze-types";
import {
  ConfidenceSlider,
  DetectionChips,
  OverlayPreview,
} from "@/components/detection-ui";

type Props = {
  result: AnalyzeResult;
  previewUrl: string | null;
  canopyConf: number;
  setCanopyConf: (v: number) => void;
  fruitConf: number;
  setFruitConf: (v: number) => void;
  leafConf: number;
  setLeafConf: (v: number) => void;
};

export function DebugModelOutput({
  result,
  previewUrl,
  canopyConf,
  setCanopyConf,
  fruitConf,
  setFruitConf,
  leafConf,
  setLeafConf,
}: Props) {
  const areaM2 = result.canopyAreaM2 ?? result.canopyAreaCm2 / 10_000;

  return (
    <div className="space-y-6 text-sm">
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.08] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="size-4 text-emerald-600" />
          <h3 className="text-lg font-semibold text-white">Canopy Model</h3>
        </div>
        <ConfidenceSlider
          label="Confidence threshold"
          value={canopyConf}
          onChange={setCanopyConf}
          color="bg-emerald-500/20 text-emerald-400"
        />
        {previewUrl ? (
          <OverlayPreview
            imageUrl={previewUrl}
            detections={result.canopyDetections}
            imageWidth={result.imageWidth}
            imageHeight={result.imageHeight}
            colorClass="border-emerald-500"
          />
        ) : null}
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-slate-400">Canopy area (corrected)</dt>
            <dd className="font-mono text-xl font-semibold text-white">
              {areaM2.toFixed(2)} m²
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-slate-400">Raw + bias</dt>
            <dd className="font-mono text-sm text-white">
              {(result.canopyAreaRawM2 ?? 0).toFixed(2)} +{" "}
              {(result.canopyAreaBiasM2 ?? 0).toFixed(2)} m²
            </dd>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <dt className="text-slate-400">Plants detected</dt>
            <dd className="font-mono text-xl font-semibold text-white">
              {result.canopyDetections.length}
            </dd>
          </div>
        </dl>
        <DetectionChips detections={result.canopyDetections} />
      </section>

      <section className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Apple className="size-4 text-amber-600" />
          <h3 className="text-lg font-semibold text-white">Fruit Model</h3>
        </div>
        <ConfidenceSlider
          label="Confidence threshold"
          value={fruitConf}
          onChange={setFruitConf}
          color="bg-amber-500/20 text-amber-400"
        />
        {previewUrl ? (
          <OverlayPreview
            imageUrl={previewUrl}
            detections={result.fruitDetections}
            imageWidth={result.imageWidth}
            imageHeight={result.imageHeight}
            colorClass="border-amber-500"
          />
        ) : null}
        <DetectionChips detections={result.fruitDetections} />
      </section>

      <section className="rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.08] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="size-4 text-cyan-600" />
          <h3 className="text-lg font-semibold text-white">Leaf Model</h3>
        </div>
        <ConfidenceSlider
          label="Confidence threshold"
          value={leafConf}
          onChange={setLeafConf}
          color="bg-cyan-500/20 text-cyan-400"
        />
        {previewUrl ? (
          <OverlayPreview
            imageUrl={previewUrl}
            detections={result.leafDetections}
            imageWidth={result.imageWidth}
            imageHeight={result.imageHeight}
            colorClass="border-cyan-500"
          />
        ) : null}
        <p className="mt-2 text-xs text-slate-300">
          Leaves: {result.leaf.detectionCount} | mask ratio{" "}
          {result.leaf.maskAreaRatio.toFixed(4)}
        </p>
        <DetectionChips detections={result.leafDetections} />
      </section>
    </div>
  );
}
