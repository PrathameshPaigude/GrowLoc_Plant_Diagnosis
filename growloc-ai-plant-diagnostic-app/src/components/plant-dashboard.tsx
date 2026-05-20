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
import { AnalyzeError, analyzeImage } from "@/lib/analyze-api";
import { buildCompositeImage } from "@/lib/composite-image";
import { BACKEND_URL } from "@/lib/config";
import { Camera, Leaf, ScanSearch, Upload, Video, History, GitCompareArrows, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle, X, Sprout, FolderOpen } from "lucide-react";

export type { AnalyzeResult } from "@/lib/analyze-types";

const BACKEND = BACKEND_URL;

// ── Types for DB entities ───────────────────────────────────────────────────

type PlantInfo = {
  id: string;
  name: string;
  species: string;
  created_at: string;
  total_scans: number;
};

type ScanInfo = {
  id: string;
  plant_id: string;
  timestamp: string;
  image_url: string | null;
  canopy_area_m2: number | null;
  fruit_counts: Record<string, number>;
  leaf_counts: Record<string, number>;
};

type MetricDelta = {
  previous: number;
  current: number;
  delta: number;
};

type ComparisonData = {
  plant_id: string;
  current_scan: ScanInfo;
  previous_scan: ScanInfo;
  days_apart: number;
  canopy: MetricDelta;
  fruit_comparison: Record<string, MetricDelta>;
  leaf_comparison: Record<string, MetricDelta>;
  summary: string[];
};

// ── Subcomponents ───────────────────────────────────────────────────────────

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

function DeltaBadge({ delta, suffix = "" }: { delta: number; suffix?: string }) {
  if (delta === 0) return <span className="flex items-center gap-1 text-slate-500 text-xs"><Minus className="size-3" />0{suffix}</span>;
  if (delta > 0) return <span className="flex items-center gap-1 text-emerald-400 text-xs"><TrendingUp className="size-3" />+{delta}{suffix}</span>;
  return <span className="flex items-center gap-1 text-red-400 text-xs"><TrendingDown className="size-3" />{delta}{suffix}</span>;
}

function ComparisonCard({ data }: { data: ComparisonData }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Scan Comparison</h3>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400 border border-white/10">
          {data.days_apart.toFixed(1)} days apart
        </span>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-white/5 bg-black/30 p-3 space-y-1.5">
        {data.summary.map((line, i) => (
          <p key={i} className={`text-xs ${line.startsWith("⚠️") ? "text-amber-400 font-medium" : "text-slate-300"}`}>
            {line}
          </p>
        ))}
      </div>

      {/* Canopy */}
      <div className="rounded-lg border border-white/5 bg-black/20 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Canopy Area</h4>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            {data.canopy.previous.toFixed(4)} m² → {data.canopy.current.toFixed(4)} m²
          </span>
          <DeltaBadge delta={data.canopy.delta} suffix=" m²" />
        </div>
      </div>

      {/* Fruit Colors */}
      {Object.keys(data.fruit_comparison).length > 0 && (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Fruit Counts</h4>
          <div className="space-y-1.5">
            {Object.entries(data.fruit_comparison).map(([color, md]) => (
              <div key={color} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 capitalize">{color}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{md.previous} → {md.current}</span>
                  <DeltaBadge delta={md.delta} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaf Colors */}
      {Object.keys(data.leaf_comparison).length > 0 && (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Leaf Counts</h4>
          <div className="space-y-1.5">
            {Object.entries(data.leaf_comparison).map(([color, md]) => {
              const isWarning = color.toLowerCase() === "yellow" && md.delta > 0;
              return (
                <div key={color} className={`flex items-center justify-between text-sm ${isWarning ? "bg-amber-500/10 -mx-1 px-1 rounded" : ""}`}>
                  <span className={`capitalize ${isWarning ? "text-amber-400 font-medium" : "text-slate-300"}`}>
                    {isWarning && <AlertTriangle className="inline size-3 mr-1" />}{color}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{md.previous} → {md.current}</span>
                    <DeltaBadge delta={md.delta} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTimeline({ scans }: { scans: ScanInfo[] }) {
  if (scans.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-4">No scans recorded yet.</p>;
  }
  return (
    <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
      {scans.slice().reverse().map((scan) => (
        <div key={scan.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-xs">
          <div className="mt-0.5 size-2 rounded-full bg-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 font-medium">{new Date(scan.timestamp).toLocaleString()}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-slate-500">
              {scan.canopy_area_m2 != null && <span>Canopy: {scan.canopy_area_m2.toFixed(4)} m²</span>}
              {Object.entries(scan.fruit_counts).filter(([k]) => k !== "Total").map(([k, v]) => (
                <span key={k} className="capitalize">{k}: {v}</span>
              ))}
              {Object.entries(scan.leaf_counts).filter(([k]) => k !== "Total").map(([k, v]) => (
                <span key={k} className="capitalize">{k}: {v}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

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
  const [canopyBias] = useState(0.0);

  // ── Plant & History state ──
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [newPlantName, setNewPlantName] = useState("");
  const [newPlantSpecies, setNewPlantSpecies] = useState("");
  const [showCreatePlant, setShowCreatePlant] = useState(false);
  const [history, setHistory] = useState<ScanInfo[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [rightTab, setRightTab] = useState<"report" | "history" | "compare">("report");

  // ── Plant selection modal state ──
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [modalTab, setModalTab] = useState<"new" | "existing">("new");
  const [modalPlantName, setModalPlantName] = useState("");
  const [modalPlantSpecies, setModalPlantSpecies] = useState("");
  const [modalSelectedId, setModalSelectedId] = useState<string | null>(null);

  // ── Fetch plants on mount ──
  const refreshPlants = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/plants`);
      if (res.ok) setPlants(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshPlants();
  }, [refreshPlants]);

  // ── Fetch history & comparison when plant changes ──
  const fetchPlantData = useCallback(async (plantId: string) => {
    try {
      const [histRes, compRes] = await Promise.all([
        fetch(`${BACKEND}/api/plants/${plantId}/history`),
        fetch(`${BACKEND}/api/plants/${plantId}/compare?days=7`),
      ]);
      if (histRes.ok) setHistory(await histRes.json());
      else setHistory([]);
      if (compRes.ok) setComparison(await compRes.json());
      else setComparison(null);
    } catch {
      setHistory([]);
      setComparison(null);
    }
  }, []);

  useEffect(() => {
    if (selectedPlantId) fetchPlantData(selectedPlantId);
  }, [selectedPlantId, fetchPlantData]);

  // ── Create plant ──
  const createPlant = useCallback(async () => {
    if (!newPlantName.trim()) return;
    try {
      const res = await fetch(`${BACKEND}/api/plants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlantName, species: newPlantSpecies || "Unknown" }),
      });
      if (res.ok) {
        const plant = await res.json();
        setPlants((prev) => [plant, ...prev]);
        setSelectedPlantId(plant.id);
        setNewPlantName("");
        setNewPlantSpecies("");
        setShowCreatePlant(false);
      }
    } catch { /* ignore */ }
  }, [newPlantName, newPlantSpecies]);

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

  // Opens the plant selection modal before running analysis
  const handleAnalyzeClick = useCallback(() => {
    if (!pendingFile) {
      setError("Choose or capture an image first.");
      return;
    }
    if (!models.canopy && !models.fruit && !models.leaf) {
      setError("Select at least one model.");
      return;
    }
    // Reset modal state
    setModalTab("new");
    setModalPlantName("");
    setModalPlantSpecies("");
    setModalSelectedId(plants.length > 0 ? plants[0].id : null);
    setShowPlantModal(true);
  }, [pendingFile, models, plants]);

  // Runs the actual analysis after plant is selected/created
  const runAnalysis = useCallback(async (plantId: string) => {
    if (!pendingFile) return;
    setShowPlantModal(false);
    setLoading(true);
    setError(null);
    setCompositeUrl(null);
    setSelectedPlantId(plantId);
    try {
      const data = await analyzeImage({
        file: pendingFile,
        enableCanopy: models.canopy,
        enableFruit: models.fruit,
        enableLeaf: models.leaf,
        canopyConf,
        canopyBias,
        fruitConf,
        leafConf,
      });
      setResult(data);
      setRightTab("report");
      if (mode === "normal" && previewUrl) {
        const composite = await buildCompositeImage(previewUrl, data, models);
        setCompositeUrl(composite);
      }

      // 2. Save scan to DB under the selected plant
      const dbBody = new FormData();
      dbBody.append("file", pendingFile);
      dbBody.append("enable_canopy", String(models.canopy));
      dbBody.append("enable_fruit", String(models.fruit));
      dbBody.append("enable_leaf", String(models.leaf));
      dbBody.append("canopy_conf", String(canopyConf));
      dbBody.append("fruit_conf", String(fruitConf));
      dbBody.append("leaf_conf", String(leafConf));
      await fetch(`${BACKEND}/api/plants/${plantId}/scans`, {
        method: "POST",
        body: dbBody,
      });
      // Refresh history & comparison
      fetchPlantData(plantId);
      refreshPlants();
    } catch (err) {
      if (err instanceof AnalyzeError) {
        setError(err.detail ? `${err.message} ${err.detail}` : err.message);
      } else {
        setError("Network error. Is the backend running on port 8001?");
      }
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
    fetchPlantData,
    refreshPlants,
  ]);

  // Handle modal confirm: create new plant or use existing
  const handleModalConfirm = useCallback(async () => {
    if (modalTab === "new") {
      if (!modalPlantName.trim()) return;
      try {
        const res = await fetch(`${BACKEND}/api/plants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modalPlantName, species: modalPlantSpecies || "Unknown" }),
        });
        if (res.ok) {
          const plant = await res.json();
          setPlants((prev) => [plant, ...prev]);
          runAnalysis(plant.id);
        }
      } catch { setError("Failed to create plant."); setShowPlantModal(false); }
    } else {
      if (!modalSelectedId) return;
      runAnalysis(modalSelectedId);
    }
  }, [modalTab, modalPlantName, modalPlantSpecies, modalSelectedId, runAnalysis]);

  const selectedPlant = plants.find((p) => p.id === selectedPlantId);

  return (
    <div className="flex min-h-screen w-full bg-[#0a0f16] text-slate-300 selection:bg-emerald-500/30">
      {/* ── Plant Selection Modal ── */}
      {showPlantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1520] p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowPlantModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-lg font-semibold text-white mb-1">Select Plant</h2>
            <p className="text-sm text-slate-400 mb-5">Choose where to save this scan</p>

            {/* Tab switch */}
            <div className="flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1 mb-5">
              <button
                onClick={() => setModalTab("new")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  modalTab === "new"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sprout className="size-4" />
                New Plant
              </button>
              <button
                onClick={() => setModalTab("existing")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  modalTab === "existing"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FolderOpen className="size-4" />
                Existing Plant
              </button>
            </div>

            {/* New Plant Form */}
            {modalTab === "new" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Plant Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Strawberry Pot A"
                    value={modalPlantName}
                    onChange={(e) => setModalPlantName(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Species / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Strawberry, Tomato, Basil..."
                    value={modalPlantSpecies}
                    onChange={(e) => setModalPlantSpecies(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleModalConfirm}
                  disabled={!modalPlantName.trim()}
                  className="w-full bg-emerald-500 py-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 mt-2"
                >
                  <Plus className="size-4 mr-1.5" />
                  Create Plant & Analyze
                </Button>
              </div>
            )}

            {/* Existing Plant Selector */}
            {modalTab === "existing" && (
              <div className="space-y-3">
                {plants.length === 0 ? (
                  <div className="rounded-lg border border-white/5 bg-black/20 p-6 text-center">
                    <Sprout className="size-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No plants registered yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Switch to "New Plant" to create one.</p>
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Plant</label>
                    <div className="space-y-1.5 max-h-[250px] overflow-auto pr-1">
                      {plants.map((plant) => (
                        <button
                          key={plant.id}
                          onClick={() => setModalSelectedId(plant.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all text-left border ${
                            modalSelectedId === plant.id
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border-white/5"
                          }`}
                        >
                          <div className={`size-8 rounded-lg flex items-center justify-center ${
                            modalSelectedId === plant.id ? "bg-emerald-500/20" : "bg-white/5"
                          }`}>
                            <Leaf className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{plant.name}</p>
                            <p className="text-xs text-slate-500">{plant.species} · {plant.total_scans} scans</p>
                          </div>
                          {modalSelectedId === plant.id && (
                            <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={handleModalConfirm}
                      disabled={!modalSelectedId}
                      className="w-full bg-emerald-500 py-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 mt-2"
                    >
                      <ScanSearch className="size-4 mr-1.5" />
                      Analyze for This Plant
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-white/5 bg-slate-900/30 p-6 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 border-b border-white/5 pb-6">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] shadow-inner shadow-emerald-500/50">
            <div className="rounded-[11px] bg-slate-950 p-2">
              <Leaf className="size-6 text-emerald-400" />
            </div>
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-white">Growloc AI</span>
        </div>

        {/* Plant Selector */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Plants</h3>
            <button
              onClick={() => setShowCreatePlant(!showCreatePlant)}
              className="rounded-md bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {showCreatePlant && (
            <div className="mb-3 space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
              <input
                type="text"
                placeholder="Plant name..."
                value={newPlantName}
                onChange={(e) => setNewPlantName(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50"
              />
              <input
                type="text"
                placeholder="Species (optional)..."
                value={newPlantSpecies}
                onChange={(e) => setNewPlantSpecies(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50"
              />
              <Button
                type="button"
                onClick={createPlant}
                disabled={!newPlantName.trim()}
                className="w-full bg-emerald-500 text-white text-xs py-1.5 hover:bg-emerald-400"
              >
                <Plus className="size-3 mr-1" /> Add Plant
              </Button>
            </div>
          )}

          <div className="space-y-1 max-h-[250px] overflow-auto">
            {plants.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No plants yet. Click + to add one.</p>
            ) : (
              plants.map((plant) => (
                <button
                  key={plant.id}
                  onClick={() => setSelectedPlantId(plant.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all text-left ${
                    selectedPlantId === plant.id
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Leaf className="size-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{plant.name}</p>
                    <p className="text-xs text-slate-500">{plant.species} · {plant.total_scans} scans</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <nav className="flex flex-col gap-2">
            <button className="flex items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-emerald-500/20">
              <ScanSearch className="size-4" />
              Diagnostics
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200">
              <Video className="size-4" />
              Camera Streams
            </button>
          </nav>
        </div>
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
            {selectedPlant && (
              <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 sm:inline-block">
                {selectedPlant.name}
              </span>
            )}
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
                      onClick={handleAnalyzeClick}
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
                  <CardHeader className="border-b border-white/5 pb-0">
                    {/* Tab bar */}
                    <div className="flex gap-1 -mb-px">
                      {([
                        { key: "report" as const, label: "Report", icon: ScanSearch },
                        { key: "history" as const, label: "History", icon: History },
                        { key: "compare" as const, label: "Compare", icon: GitCompareArrows },
                      ]).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setRightTab(key)}
                          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            rightTab === key
                              ? "border-emerald-500 text-emerald-400"
                              : "border-transparent text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <Icon className="size-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-6">
                    {/* Report tab */}
                    {rightTab === "report" && (
                      <>
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
                      </>
                    )}

                    {/* History tab */}
                    {rightTab === "history" && (
                      <div>
                        {!selectedPlantId ? (
                          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-50 py-12">
                            <History className="size-12 text-slate-500" />
                            <p className="text-sm text-slate-400">Select a plant from the sidebar to view scan history.</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-semibold text-white">Scan Timeline</h3>
                              <span className="text-xs text-slate-500">{history.length} scans</span>
                            </div>
                            <HistoryTimeline scans={history} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compare tab */}
                    {rightTab === "compare" && (
                      <div>
                        {!selectedPlantId ? (
                          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-50 py-12">
                            <GitCompareArrows className="size-12 text-slate-500" />
                            <p className="text-sm text-slate-400">Select a plant from the sidebar to view comparisons.</p>
                          </div>
                        ) : !comparison ? (
                          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-50 py-12">
                            <GitCompareArrows className="size-12 text-slate-500" />
                            <p className="text-sm text-slate-400">Need at least 2 scans to compare.<br/>Upload another image after some time.</p>
                          </div>
                        ) : (
                          <ComparisonCard data={comparison} />
                        )}
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
              {areaM2.toFixed(4)} m²
            </dd>
          </div>
          <div className="flex justify-between rounded-lg bg-black/20 px-3 py-2">
            <dt className="text-slate-300">Canopy plants</dt>
            <dd className="text-white">{result.canopyDetections.length}</dd>
          </div>
        </>
      ) : null}
      {models.fruit ? (
        <>
          <div className="flex justify-between rounded-lg bg-amber-500/10 px-3 py-2">
            <dt className="text-slate-300">Fruit count</dt>
            <dd className="text-white">{result.fruitDetections.length}</dd>
          </div>
          {Object.entries(result.fruitColorCounts || {}).length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 pl-2">
              {Object.entries(result.fruitColorCounts).map(([color, count]) => (
                <div key={color} className="flex justify-between rounded bg-black/20 px-2.5 py-1.5 text-xs">
                  <span className="text-slate-400 capitalize">{color}</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
      {models.leaf ? (
        <>
          <div className="flex justify-between rounded-lg bg-cyan-500/10 px-3 py-2">
            <dt className="text-slate-300">Leaf count</dt>
            <dd className="text-white">{result.leaf.detectionCount}</dd>
          </div>
          {Object.entries(result.leafColorCounts || {}).length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 pl-2">
              {Object.entries(result.leafColorCounts).map(([color, count]) => (
                <div key={color} className="flex justify-between rounded bg-black/20 px-2.5 py-1.5 text-xs">
                  <span className="text-slate-400 capitalize">{color}</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </dl>
  );
}
