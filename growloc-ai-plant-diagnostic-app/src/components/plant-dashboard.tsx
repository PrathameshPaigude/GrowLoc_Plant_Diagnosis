"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { DebugModelOutput } from "@/components/debug-model-output";
import { ConfidenceSlider } from "@/components/detection-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AnalyzeResult,
  AppMode,
  ModelSelection,
} from "@/lib/analyze-types";
import { buildCompositeImage } from "@/lib/composite-image";
import { Camera, Leaf, ScanSearch, Upload, Video } from "lucide-react";

export type { AnalyzeResult } from "@/lib/analyze-types";

function ModelToggles({
  models,
  onChange,
}: {
  models: ModelSelection;
  onChange: (m: ModelSelection) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {(
        [
          ["canopy", "Canopy", "text-emerald-400"],
          ["fruit", "Fruit", "text-amber-400"],
          ["leaf", "Leaf", "text-cyan-400"],
        ] as const
      ).map(([key, label, color]) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={models[key]}
            onChange={(e) =>
              onChange({ ...models, [key]: e.target.checked })
            }
            className="accent-emerald-500"
          />
          <span className={color}>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function PlantDashboard() {
  const inputId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<AppMode>("normal");
  const [models, setModels] = useState<ModelSelection>({
    canopy: true,
    fruit: true,
    leaf: true,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [liveActive, setLiveActive] = useState(false);

  const [canopyConf, setCanopyConf] = useState(0.1);
  const [fruitConf, setFruitConf] = useState(0.5);
  const [leafConf, setLeafConf] = useState(0.4);
  const [canopyBias, setCanopyBias] = useState(0.0);

  const setFile = useCallback((file: File) => {
    setPendingFile(file);
    setFileName(file.name);
    setResult(null);
    setCompositeUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;
      setFile(file);
    },
    [setFile],
  );

  const stopLive = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLiveActive(false);
  }, []);

  const startLive = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLiveActive(true);
    } catch {
      setError("Camera access denied or unavailable.");
    }
  }, []);

  useEffect(() => () => stopLive(), [stopLive]);

  const captureFromLive = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setFile(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [setFile]);

  const analyze = useCallback(async () => {
    if (!pendingFile) {
      setError("Choose or capture an image first.");
      return;
    }
    if (!models.canopy && !models.fruit && !models.leaf) {
      setError("Select at least one model.");
      return;
    }
    setLoading(true);
    setError(null);
    setCompositeUrl(null);
    try {
      const body = new FormData();
      body.append("file", pendingFile);
      body.append("enable_canopy", String(models.canopy));
      body.append("enable_fruit", String(models.fruit));
      body.append("enable_leaf", String(models.leaf));
      body.append("canopy_conf", String(canopyConf));
      body.append("canopy_area_bias_m2", String(canopyBias));
      body.append("fruit_conf", String(fruitConf));
      body.append("leaf_conf", String(leafConf));
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data);
      if (mode === "normal" && previewUrl) {
        const composite = await buildCompositeImage(previewUrl, data, models);
        setCompositeUrl(composite);
      }
    } catch {
      setError("Network error. Is the backend running on port 8001?");
    } finally {
      setLoading(false);
    }
  }, [
    pendingFile,
    models,
    canopyConf,
    canopyBias,
    fruitConf,
    leafConf,
    mode,
    previewUrl,
  ]);

  return (
    <div className="flex min-h-screen w-full bg-[#0a0f16] text-slate-300 selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-slate-900/30 p-6 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 border-b border-white/5 pb-6">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] shadow-inner shadow-emerald-500/50">
            <div className="rounded-[11px] bg-slate-950 p-2">
              <Leaf className="size-6 text-emerald-400" />
            </div>
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-white">Growloc AI</span>
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          <button className="flex items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-emerald-500/20">
            <ScanSearch className="size-4" />
            Diagnostics
          </button>
          <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
            <Video className="size-4" />
            Camera Streams
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10%] top-[-10%] size-[600px] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-screen" />
          <div className="absolute right-[-10%] top-[40%] size-[500px] rounded-full bg-cyan-500/10 blur-[120px] mix-blend-screen" />
        </div>

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/20 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white tracking-tight">Diagnostic Dashboard</h1>
            <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 sm:inline-block">
              System Online
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-1 rounded-full border border-white/10 bg-black/40 p-1">
              {(["live", "normal", "debug"] as AppMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    mode === m
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            
            <div className="hidden items-center gap-3 sm:flex">
               <div className="text-right text-xs">
                 <p className="font-medium text-slate-200">Admin User</p>
                 <p className="text-slate-500">Lab Alpha</p>
               </div>
               <div className="size-9 rounded-full bg-slate-800 border border-white/10 shadow-inner" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
           <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[400px_minmax(0,1fr)]">
             
             {/* Left Column: Input and Controls */}
             <div className="flex flex-col gap-6">
                <Card className="border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="flex items-center gap-2 text-white">
                      {mode === "live" ? (
                        <Video className="size-4 text-cyan-400" />
                      ) : (
                        <Upload className="size-4 text-emerald-400" />
                      )}
                      {mode === "live" ? "Live Camera" : "Upload Image"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure AI models and upload a sample
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5 pt-6">
                    <ModelToggles models={models} onChange={setModels} />

                    {mode === "live" ? (
                      <div className="space-y-4">
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-inner">
                          <video
                            ref={videoRef}
                            className="size-full object-cover"
                            playsInline
                            muted
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                            onClick={liveActive ? stopLive : startLive}
                          >
                            {liveActive ? "Stop Camera" : "Start Camera"}
                          </Button>
                          <Button
                            type="button"
                            onClick={captureFromLive}
                            disabled={!liveActive}
                            className="bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/50"
                          >
                            <Camera className="mr-2 size-4" />
                            Capture
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] py-8 transition-colors hover:bg-white/[0.04]">
                          <Upload className="mb-3 size-6 text-slate-400" />
                          <p className="text-sm text-slate-300 font-medium">Click to upload image</p>
                          <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF</p>
                          <Input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        {fileName && (
                           <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 border border-emerald-500/20">
                             <Leaf className="size-4" />
                             <span className="truncate font-medium">{fileName}</span>
                           </div>
                        )}
                      </div>
                    )}

                    {previewUrl && mode !== "live" ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 shadow-inner bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="size-full object-contain"
                        />
                      </div>
                    ) : null}

                    {(mode === "normal" || mode === "debug") && (
                      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-black/20 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model Confidence</h3>
                        {models.canopy && (
                            <ConfidenceSlider label="Canopy" value={canopyConf} onChange={setCanopyConf} color="bg-emerald-500/20 text-emerald-400" />
                        )}
                        {models.fruit && (
                            <ConfidenceSlider label="Fruit" value={fruitConf} onChange={setFruitConf} color="bg-amber-500/20 text-amber-400" />
                        )}
                        {models.leaf && (
                            <ConfidenceSlider label="Leaf" value={leafConf} onChange={setLeafConf} color="bg-cyan-500/20 text-cyan-400" />
                        )}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={analyze}
                      disabled={loading || !pendingFile}
                      className="w-full bg-emerald-500 py-6 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-900/50 hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="size-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Analyzing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ScanSearch className="size-5" />
                          Run Diagnostics
                        </span>
                      )}
                    </Button>
                    {error && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        {error}
                      </div>
                    )}
                  </CardContent>
                </Card>
             </div>

             {/* Right Column: Output */}
             <div className="flex flex-col gap-6">
                <Card className="flex h-full flex-col border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-white">
                      {mode === "normal"
                        ? "Diagnostic Report"
                        : mode === "debug"
                          ? "Debug Breakdown"
                          : "Results"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {mode === "normal"
                        ? "Combined annotated imagery and final metrics"
                        : mode === "debug"
                          ? "Per-model detailed overlays"
                          : "Results will appear here"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 p-6">
                    {!result ? (
                      <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-50">
                        <ScanSearch className="size-12 text-slate-500" />
                        <p className="text-sm text-slate-400">
                          Waiting for input.<br/>Upload an image and run diagnostics to see results.
                        </p>
                      </div>
                    ) : mode === "normal" && compositeUrl ? (
                      <div className="space-y-6">
                        <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={compositeUrl}
                            alt="Diagnostic report"
                            className="w-full object-cover"
                          />
                        </div>
                        
                        <div className="rounded-xl border border-white/5 bg-black/20 p-5">
                           <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Key Metrics</h3>
                           <SummaryCounts result={result} models={models} />
                        </div>
                        
                        <div className="flex justify-end">
                          <a
                            href={compositeUrl}
                            download="growloc-diagnostic.jpg"
                            className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                          >
                            Download High-Res Report
                          </a>
                        </div>
                      </div>
                    ) : mode === "debug" ? (
                      <div className="w-full">
                        <DebugModelOutput
                          result={result}
                          previewUrl={previewUrl}
                          canopyConf={canopyConf}
                          setCanopyConf={setCanopyConf}
                          fruitConf={fruitConf}
                          setFruitConf={setFruitConf}
                          leafConf={leafConf}
                          setLeafConf={setLeafConf}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/5 bg-black/20 p-5">
                         <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Key Metrics</h3>
                         <SummaryCounts result={result} models={models} />
                      </div>
                    )}
                  </CardContent>
                </Card>
             </div>
             
           </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCounts({
  result,
  models,
}: {
  result: AnalyzeResult;
  models: ModelSelection;
}) {
  const areaM2 = result.canopyAreaM2 ?? result.canopyAreaCm2 / 10_000;
  return (
    <dl className="grid gap-2 text-sm">
      {models.canopy ? (
        <>
          <div className="flex justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
            <dt className="text-slate-300">Canopy area</dt>
            <dd className="font-mono font-semibold text-white">
              {areaM2.toFixed(1)} m²
            </dd>
          </div>
          <div className="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <dt className="text-slate-300">Canopy plants</dt>
            <dd className="text-white">{result.canopyDetections.length}</dd>
          </div>
        </>
      ) : null}
      {models.fruit ? (
        <div className="flex justify-between rounded-lg bg-amber-500/10 px-3 py-2">
          <dt className="text-slate-300">Fruit count</dt>
          <dd className="text-white">{result.fruitDetections.length}</dd>
        </div>
      ) : null}
      {models.leaf ? (
        <div className="flex justify-between rounded-lg bg-cyan-500/10 px-3 py-2">
          <dt className="text-slate-300">Leaf count</dt>
          <dd className="text-white">{result.leaf.detectionCount}</dd>
        </div>
      ) : null}
    </dl>
  );
}
