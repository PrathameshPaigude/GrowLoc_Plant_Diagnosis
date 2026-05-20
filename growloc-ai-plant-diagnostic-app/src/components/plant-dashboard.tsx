import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AnalyzeResult,
  ModelSelection,
} from "@/lib/analyze-types";
import { AnalyzeError, analyzeImage } from "@/lib/analyze-api";
import { buildCompositeImage } from "@/lib/composite-image";
import { BACKEND_URL } from "@/lib/config";
import { Camera, ScanSearch, Upload, GitCompareArrows, Sprout, ImageIcon, Search, AlignJustify, List, ChevronDown, ChevronUp, Image as ImageIconLucide, Sun, Moon, Pencil, Trash2 } from "lucide-react";

export type { AnalyzeResult } from "@/lib/analyze-types";

const BACKEND = BACKEND_URL;

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
  note: string | null;
  canopy_area_m2: number | null;
  fruit_counts: Record<string, number>;
  leaf_counts: Record<string, number>;
};

function ModelToggles({
  models,
  onChange,
}: {
  models: ModelSelection;
  onChange: (m: ModelSelection) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(
        [
          ["canopy", "Canopy", "text-emerald-400"],
          ["fruit", "Fruit", "text-amber-400"],
          ["leaf", "Leaf", "text-cyan-400"],
        ] as const
      ).map(([key, label, color]) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs font-medium"
        >
          <input
            type="checkbox"
            checked={models[key as keyof ModelSelection]}
            onChange={(e) =>
              onChange({ ...models, [key]: e.target.checked })
            }
            className="accent-primary size-3"
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

  const [models, setModels] = useState<ModelSelection>({
    canopy: true,
    fruit: true,
    leaf: true,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  
  // Isolated images for detailed view
  const [detailedImages, setDetailedImages] = useState<{canopy: string|null, fruit: string|null, leaf: string|null}>({canopy: null, fruit: null, leaf: null});

  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [liveActive, setLiveActive] = useState(false);

  // Theme effect
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  const [canopyConf] = useState(0.10);
  const [fruitConf] = useState(0.20);
  const [leafConf] = useState(0.20);
  const [canopyBias] = useState(0.0);

  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  const [history, setHistory] = useState<ScanInfo[]>([]);
  
  // Custom Comparison State
  const [historyScan1Id, setHistoryScan1Id] = useState<string | null>(null);
  const [historyScan2Id, setHistoryScan2Id] = useState<string | null>(null);
  const [showComparisonImages, setShowComparisonImages] = useState(false);

  // UI View state
  const [viewState, setViewState] = useState<"home" | "results">("home");
  const [detectionMode, setDetectionMode] = useState<"summary" | "detailed">("summary");

  // Inline Info Form State
  const [modalTab, setModalTab] = useState<"new" | "existing">("new");
  const [modalPlantName, setModalPlantName] = useState("");
  const [modalPlantSpecies, setModalPlantSpecies] = useState("Strawberry");
  const [customSpecies, setCustomSpecies] = useState("");
  const [modalSelectedId, setModalSelectedId] = useState<string | null>(null);
  const [modalNote, setModalNote] = useState("");

  const refreshPlants = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/plants`);
      if (res.ok) {
        const data = await res.json();
        setPlants(data);
        if (data.length > 0 && !selectedPlantId) {
          setSelectedPlantId(data[0].id);
        }
      }
    } catch { /* ignore */ }
  }, [selectedPlantId]);

  useEffect(() => {
    refreshPlants();
  }, [refreshPlants]);

  const fetchPlantHistory = useCallback(async (plantId: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/plants/${plantId}/history?days=365`);
      if (res.ok) {
        const data: ScanInfo[] = await res.json();
        setHistory(data);
        if (data.length >= 2) {
          setHistoryScan2Id(data[data.length - 1].id);
          setHistoryScan1Id(data[data.length - 2].id);
        } else if (data.length === 1) {
          setHistoryScan2Id(data[0].id);
          setHistoryScan1Id(data[0].id);
        } else {
          setHistoryScan1Id(null);
          setHistoryScan2Id(null);
        }
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (selectedPlantId) fetchPlantHistory(selectedPlantId);
  }, [selectedPlantId, fetchPlantHistory]);

  const setFile = useCallback((file: File) => {
    setPendingFile(file);
    setResult(null);
    setCompositeUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    
    // Auto-setup inline form
    setModalTab("new");
    setModalPlantName("");
    setModalPlantSpecies("Strawberry");
    setCustomSpecies("");
    setModalSelectedId(plants.length > 0 ? plants[0].id : null);
    setModalNote("");
  }, [plants]);

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
      setError("Camera access denied.");
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

  const countWords = (str: string) => str.trim().split(/\s+/).filter(w => w.length > 0).length;

  const runAnalysis = useCallback(async (plantId: string, noteToSave: string) => {
    if (!pendingFile) return;
    setViewState("results");
    setLoading(true);
    setError(null);
    setCompositeUrl(null);
    setDetailedImages({canopy: null, fruit: null, leaf: null});
    setSelectedPlantId(plantId);
    
    // Auto scroll to top for results
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
      if (previewUrl) {
        const composite = await buildCompositeImage(previewUrl, data, models);
        setCompositeUrl(composite);

        const cImg = models.canopy ? await buildCompositeImage(previewUrl, data, { canopy: true, fruit: false, leaf: false }) : null;
        const fImg = models.fruit ? await buildCompositeImage(previewUrl, data, { canopy: false, fruit: true, leaf: false }) : null;
        const lImg = models.leaf ? await buildCompositeImage(previewUrl, data, { canopy: false, fruit: false, leaf: true }) : null;
        setDetailedImages({ canopy: cImg, fruit: fImg, leaf: lImg });
      }

      const dbBody = new FormData();
      dbBody.append("file", pendingFile);
      dbBody.append("enable_canopy", String(models.canopy));
      dbBody.append("enable_fruit", String(models.fruit));
      dbBody.append("enable_leaf", String(models.leaf));
      dbBody.append("canopy_conf", String(canopyConf));
      dbBody.append("fruit_conf", String(fruitConf));
      dbBody.append("leaf_conf", String(leafConf));
      if (noteToSave) {
        dbBody.append("note", noteToSave);
      }
      await fetch(`${BACKEND}/api/plants/${plantId}/scans`, {
        method: "POST",
        body: dbBody,
      });
      
      fetchPlantHistory(plantId);
      refreshPlants();
    } catch (err) {
      if (err instanceof AnalyzeError) {
        setError(err.detail ? `${err.message} ${err.detail}` : err.message);
      } else {
        setError("Network error.");
      }
      setViewState("home");
    } finally {
      setLoading(false);
    }
  }, [
    pendingFile, models, canopyConf, canopyBias, fruitConf, leafConf,
    previewUrl, fetchPlantHistory, refreshPlants,
  ]);

  const handleInlineConfirm = useCallback(async () => {
    const finalNote = countWords(modalNote) <= 20 ? modalNote.trim() : modalNote.trim().split(/\s+/).slice(0, 20).join(" ");
    if (modalTab === "new") {
      if (!modalPlantName.trim()) return;
      const finalSpecies = modalPlantSpecies === "Other" ? customSpecies : modalPlantSpecies;
      try {
        const res = await fetch(`${BACKEND}/api/plants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modalPlantName, species: finalSpecies || "Unknown" }),
        });
        if (res.ok) {
          const plant = await res.json();
          setPlants((prev) => [plant, ...prev]);
          runAnalysis(plant.id, finalNote);
        }
      } catch { setError("Failed to create plant."); }
    } else {
      if (!modalSelectedId) return;
      runAnalysis(modalSelectedId, finalNote);
    }
  }, [modalTab, modalPlantName, modalPlantSpecies, customSpecies, modalSelectedId, modalNote, runAnalysis]);

  const handleRenamePlant = async () => {
    if (!selectedPlantId) return;
    const newName = prompt("Enter new plant name:");
    if (!newName?.trim()) return;
    
    try {
      const res = await fetch(`${BACKEND}/api/plants/${selectedPlantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        refreshPlants();
      }
    } catch {
      alert("Failed to rename plant.");
    }
  };

  const handleDeletePlant = async () => {
    if (!selectedPlantId) return;
    if (!confirm("Are you sure you want to completely delete this plant and all its history?")) return;
    
    try {
      const res = await fetch(`${BACKEND}/api/plants/${selectedPlantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedPlantId(null);
        refreshPlants();
      }
    } catch {
      alert("Failed to delete plant.");
    }
  };

  const selectedPlant = plants.find((p) => p.id === selectedPlantId);
  const scan1 = history.find(h => h.id === historyScan1Id);
  const scan2 = history.find(h => h.id === historyScan2Id);
  
  const isFormValid = (modalTab === "new" && modalPlantName.trim()) || (modalTab === "existing" && modalSelectedId);

  return (
    <div className={`flex min-h-screen w-full flex-col bg-background text-foreground selection:bg-primary/30 font-sans ${theme}`}>
      
      {/* ── Main Header ── */}
      <header className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-border bg-card/90 px-8 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="Growloc Logo" className="h-7 w-auto" />
          <h1 className="text-lg font-bold text-white tracking-tight ml-2">Diagnostic Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          {viewState === "results" && (
            <Button variant="outline" onClick={() => setViewState("home")} className="border-white/20 bg-white/5 hover:bg-white/10 px-4 text-xs font-semibold h-7">
              ← Back
            </Button>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {theme === "dark" ? (
              <><Sun className="size-3" /> Light Mode</>
            ) : (
              <><Moon className="size-3" /> Dark Mode</>
            )}
          </button>
        </div>
      </header>

      {/* ── Secondary Sticky Header for Results ── */}
      {viewState === "results" && result && (
        <div className="sticky top-[53px] z-40 flex shrink-0 items-center justify-between border-b border-border bg-black/80 px-8 py-3 backdrop-blur-md shadow-lg">
           <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-white tracking-wide">Diagnostic Results</h2>
             <div className="flex items-center gap-2 text-xs font-medium text-slate-400 border-l border-white/20 pl-4">
                <span>Plant: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded ml-1">{selectedPlant?.name}</strong></span>
                <span>Type: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded ml-1">{selectedPlant?.species}</strong></span>
                <span className="text-[10px] ml-2">{new Date().toLocaleString()}</span>
             </div>
           </div>
           
           <div className="flex bg-slate-900 border border-white/20 rounded-md p-0.5 shadow-inner">
              <button 
                onClick={() => setDetectionMode("summary")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-bold transition-all ${detectionMode === "summary" ? "bg-primary text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <ImageIcon className="size-3.5" /> Summary View
              </button>
              <button 
                onClick={() => setDetectionMode("detailed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-bold transition-all ${detectionMode === "detailed" ? "bg-primary text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
              >
                <List className="size-3.5" /> Detailed View
              </button>
           </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 relative flex flex-col items-center w-full">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10%] top-[-10%] size-[500px] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
          <div className="absolute right-[-10%] top-[40%] size-[400px] rounded-full bg-secondary/5 blur-[120px] mix-blend-screen" />
        </div>

        <div className="w-full max-w-[1400px] flex-1 px-4 lg:px-8 pb-12">
          
          {/* HOME VIEW */}
          {viewState === "home" && (
            <div className="flex flex-col w-full min-h-[calc(100vh-60px)]">
              {/* TOP SECTION: 100vh fit (Upload + Info) */}
              <div className="flex flex-col md:flex-row gap-6 pt-6 pb-4 w-full h-[calc(100vh-100px)]">
                
                {/* Left: Upload (Reduced width) */}
                <div className="flex flex-col gap-3 w-full md:w-[40%] h-full shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-0.5">Upload Scan</h2>
                    <p className="text-xs text-slate-400">Provide an image of the plant.</p>
                  </div>
                  
                  <Card className="border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl overflow-hidden rounded-xl flex-1 flex flex-col">
                    <CardContent className="flex flex-col gap-3 p-4 flex-1 justify-center relative">
                      {pendingFile && previewUrl ? (
                         <div className="flex-1 relative rounded-lg border border-white/10 overflow-hidden bg-black/50 group">
                           <img src={previewUrl} className="w-full h-full object-contain" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <Button size="sm" variant="outline" onClick={() => { setPendingFile(null); setPreviewUrl(null); }} className="bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40">Remove</Button>
                           </div>
                         </div>
                      ) : (
                        <>
                          <div className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] py-12 transition-all hover:bg-white/[0.04] hover:border-primary/60 group shadow-inner flex-1">
                            <Upload className="mb-3 size-8 text-slate-500 group-hover:text-primary transition-colors" />
                            <p className="text-sm text-slate-200 font-medium mb-1">Click to upload</p>
                            <p className="text-[10px] text-slate-500">JPG, PNG, WEBP</p>
                            <Input
                              id={inputId}
                              type="file"
                              accept="image/*"
                              onChange={onFileChange}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </div>

                          <div className="relative flex items-center gap-4 py-1">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                          </div>

                          {liveActive ? (
                            <div className="relative aspect-video overflow-hidden rounded-xl border border-primary/20 bg-black shadow-inner shadow-primary/10">
                              <video ref={videoRef} className="size-full object-cover" playsInline muted />
                              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                <Button onClick={stopLive} variant="outline" className="bg-black/50 border-white/20 backdrop-blur-md px-3 h-7 text-xs">Cancel</Button>
                                <Button onClick={captureFromLive} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-3 h-7 text-xs font-bold">
                                  <Camera className="mr-1.5 size-3" /> Capture
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button onClick={startLive} variant="outline" className="w-full py-6 border-white/20 border-dashed text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5 bg-transparent text-sm">
                              <Camera className="mr-2 size-4 text-slate-400" /> Use Camera
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Inline Info Form */}
                <div className="flex flex-col gap-3 w-full md:w-[60%] h-full">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-0.5">Scan Details</h2>
                    <p className="text-xs text-slate-400">Fill info to begin analysis.</p>
                  </div>
                  
                  <Card className="border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl overflow-hidden rounded-xl flex-1 flex flex-col">
                    <CardContent className="flex flex-col justify-center gap-6 p-6 flex-1">
                      
                      {/* Tabs */}
                      <div className="flex gap-1.5 rounded-lg border border-white/10 bg-black/30 p-1 shrink-0">
                        <button
                          onClick={() => setModalTab("new")}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-bold transition-all ${
                            modalTab === "new" ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          New Plant
                        </button>
                        <button
                          onClick={() => setModalTab("existing")}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-bold transition-all ${
                            modalTab === "existing" ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          Existing Plant
                        </button>
                      </div>

                      <div className="flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2">
                        {modalTab === "new" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Plant Name *</label>
                              <Input
                                placeholder="e.g. Row 4 Strawberry"
                                value={modalPlantName}
                                onChange={(e) => setModalPlantName(e.target.value)}
                                className="bg-black/40 border-white/20 text-white h-9 text-xs rounded-lg focus-visible:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Plant Type</label>
                              <div className="relative">
                                <select
                                  value={modalPlantSpecies}
                                  onChange={(e) => setModalPlantSpecies(e.target.value)}
                                  className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer h-9"
                                >
                                  <option value="Strawberry">Strawberry</option>
                                  <option value="Apple">Apple</option>
                                  <option value="Lemon">Lemon</option>
                                  <option value="Tomato">Tomato</option>
                                  <option value="Other">Other...</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-slate-400 pointer-events-none" />
                              </div>
                              {modalPlantSpecies === "Other" && (
                                <Input
                                  placeholder="Specify plant type..."
                                  value={customSpecies}
                                  onChange={(e) => setCustomSpecies(e.target.value)}
                                  className="mt-2 bg-black/40 border-white/20 text-white h-9 text-xs rounded-lg focus-visible:ring-primary"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Select Existing Plant *</label>
                            {plants.length === 0 ? (
                              <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center text-xs text-slate-400">No plants available.</div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={modalSelectedId || ""}
                                  onChange={(e) => setModalSelectedId(e.target.value)}
                                  className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer h-9"
                                >
                                  {plants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-slate-400 pointer-events-none" />
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex justify-between">
                            <span>Note (Optional)</span>
                            <span className={`${countWords(modalNote) >= 20 ? "text-amber-400" : "text-slate-500"}`}>{countWords(modalNote)} / 20</span>
                          </label>
                          <textarea
                            placeholder="e.g. fertilizer added today..."
                            value={modalNote}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (countWords(val) <= 20 || val.length < modalNote.length) {
                                setModalNote(val);
                              }
                            }}
                            className="w-full rounded-lg bg-black/40 border border-white/20 p-2.5 text-xs text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary h-16 resize-none"
                          />
                        </div>

                        <div>
                           <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">AI Models</label>
                           <ModelToggles models={models} onChange={setModels} />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleInlineConfirm}
                        disabled={!isFormValid || !pendingFile || loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-5 text-sm font-bold rounded-lg shadow-lg shrink-0 transition-transform active:scale-[0.98]"
                      >
                        {loading ? "Processing..." : <><ScanSearch className="size-4 mr-2" /> Analyze Image</>}
                      </Button>
                      
                      {error && <div className="text-red-400 text-xs font-medium text-center">{error}</div>}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Scroll down button */}
              <div className="flex justify-center shrink-0 mb-8 mt-2">
                <Button 
                  variant="ghost" 
                  onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-slate-400 hover:text-primary animate-pulse"
                >
                   <ChevronDown className="mr-2 size-5" /> Monitor Plant History
                </Button>
              </div>

              {/* BOTTOM SECTION: History */}
              <div id="history-section" className="pt-8 border-t border-white/10 min-h-screen">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Plant History</h2>
                    <p className="text-sm text-slate-400">Compare and analyze scans over time.</p>
                  </div>
                </div>
                
                <Card className="flex flex-col border-white/5 bg-white/[0.02] shadow-2xl backdrop-blur-xl rounded-xl overflow-hidden">
                  <CardContent className="p-6">
                     <div className="grid lg:grid-cols-[300px_1fr] gap-8">
                       
                       {/* Left Col: Plant Selection & Date Selection */}
                       <div className="flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-8">
                          
                          {/* Plant Selector */}
                          <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select Plant</label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <select 
                                  value={selectedPlantId || ""} 
                                  onChange={(e) => setSelectedPlantId(e.target.value)}
                                  className="w-full rounded-md bg-slate-900 border border-white/20 px-3 py-2 text-sm font-medium text-slate-200 outline-none focus:border-primary shadow-sm appearance-none cursor-pointer"
                                >
                                  {plants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-slate-400 pointer-events-none" />
                              </div>
                              {selectedPlantId && (
                                <div className="flex gap-1 shrink-0">
                                  <Button onClick={handleRenamePlant} size="icon" variant="outline" className="size-9 border-white/20 hover:bg-white/10 hover:text-white" title="Rename Plant">
                                    <Pencil className="size-4 text-slate-400" />
                                  </Button>
                                  <Button onClick={handleDeletePlant} size="icon" variant="outline" className="size-9 border-red-500/20 hover:bg-red-500/20 hover:border-red-500" title="Delete Plant">
                                    <Trash2 className="size-4 text-red-400" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {selectedPlant && (
                              <div className="text-xs text-slate-400 bg-black/20 p-2 rounded-md border border-white/5">
                                Type: <span className="font-semibold text-slate-200">{selectedPlant.species}</span> <br/>
                                Total Scans: <span className="font-semibold text-slate-200">{selectedPlant.total_scans}</span>
                              </div>
                            )}
                          </div>

                          {/* Scan Selectors */}
                          {history.length >= 2 && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                               <div className="space-y-1.5">
                                  <select 
                                     value={historyScan1Id || ""}
                                     onChange={e => setHistoryScan1Id(e.target.value)}
                                     className="w-full rounded-md bg-black/40 border border-white/20 px-3 py-2 text-sm text-slate-300 outline-none focus:border-primary focus:ring-1"
                                  >
                                     {history.map(h => (
                                       <option key={h.id} value={h.id}>{new Date(h.timestamp).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</option>
                                     ))}
                                  </select>
                               </div>
                               <div className="space-y-1.5">
                                  <select 
                                     value={historyScan2Id || ""}
                                     onChange={e => setHistoryScan2Id(e.target.value)}
                                     className="w-full rounded-md bg-black/40 border border-primary/40 px-3 py-2 text-sm text-primary outline-none focus:border-primary focus:ring-1"
                                  >
                                     {history.map(h => (
                                       <option key={h.id} value={h.id}>{new Date(h.timestamp).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</option>
                                     ))}
                                  </select>
                               </div>
                               
                               <Button 
                                 variant="outline" 
                                 onClick={() => setShowComparisonImages(!showComparisonImages)}
                                 className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-between text-xs h-8"
                               >
                                 <span className="flex items-center gap-2"><ImageIconLucide className="size-3.5"/> Image Comparison</span>
                                 {showComparisonImages ? <ChevronUp className="size-3.5"/> : <ChevronDown className="size-3.5"/>}
                               </Button>
                            </div>
                          )}
                       </div>
                       
                       {/* Right Col: Table & Images */}
                       <div className="flex-1">
                          {selectedPlant ? (
                            history.length >= 2 && scan1 && scan2 ? (
                              <div className="space-y-6">
                                {/* Images */}
                                {showComparisonImages && (
                                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="aspect-[4/3] rounded-lg bg-black border border-white/10 overflow-hidden shadow-inner">
                                      {scan1.image_url ? (
                                        <img src={`${BACKEND}${scan1.image_url}`} className="w-full h-full object-contain" />
                                      ) : <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="size-8"/></div>}
                                    </div>
                                    <div className="aspect-[4/3] rounded-lg bg-black border border-white/10 overflow-hidden shadow-inner">
                                      {scan2.image_url ? (
                                        <img src={`${BACKEND}${scan2.image_url}`} className="w-full h-full object-contain" />
                                      ) : <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="size-8"/></div>}
                                    </div>
                                  </div>
                                )}

                                {/* Comparison Table */}
                                <div className="rounded-xl border border-white/10 bg-slate-900/60 shadow-inner overflow-hidden text-sm">
                                   <table className="w-full text-left border-collapse">
                                     <thead>
                                       <tr className="border-b border-white/10 bg-black/40">
                                         <th className="py-3 px-4 font-semibold text-slate-400 w-1/3">Parameter</th>
                                         <th className="py-3 px-4 font-semibold text-slate-400 w-1/3">Scan 1</th>
                                         <th className="py-3 px-4 font-semibold text-primary w-1/3">Scan 2</th>
                                       </tr>
                                     </thead>
                                     <tbody className="divide-y divide-white/5">
                                       <tr>
                                         <td className="py-3 px-4 text-slate-300 font-medium">Note</td>
                                         <td className="py-3 px-4 text-slate-400 italic break-words">{scan1.note || "-"}</td>
                                         <td className="py-3 px-4 text-slate-200 italic break-words">{scan2.note || "-"}</td>
                                       </tr>
                                       <tr>
                                         <td className="py-3 px-4 text-slate-300 font-medium">Canopy Area</td>
                                         <td className="py-3 px-4 text-slate-400">{scan1.canopy_area_m2?.toFixed(4) || "0.0000"} m²</td>
                                         <td className="py-3 px-4 text-slate-200 font-mono">{scan2.canopy_area_m2?.toFixed(4) || "0.0000"} m²</td>
                                       </tr>
                                       <tr>
                                         <td className="py-3 px-4 text-slate-300 font-medium align-top">Fruits</td>
                                         <td className="py-3 px-4 text-slate-400 align-top">
                                           {Object.keys(scan1.fruit_counts || {}).length > 0 ? (
                                             <ul className="space-y-1">
                                               {Object.entries(scan1.fruit_counts).map(([color, count]) => (
                                                 <li key={color} className="capitalize">{color}: {count}</li>
                                               ))}
                                             </ul>
                                           ) : "-"}
                                         </td>
                                         <td className="py-3 px-4 text-slate-200 align-top">
                                           {Object.keys(scan2.fruit_counts || {}).length > 0 ? (
                                             <ul className="space-y-1">
                                               {Object.entries(scan2.fruit_counts).map(([color, count]) => (
                                                 <li key={color} className="capitalize">{color}: {count}</li>
                                               ))}
                                             </ul>
                                           ) : "-"}
                                         </td>
                                       </tr>
                                       <tr>
                                         <td className="py-3 px-4 text-slate-300 font-medium align-top">Leaves</td>
                                         <td className="py-3 px-4 text-slate-400 align-top">
                                           {Object.keys(scan1.leaf_counts || {}).length > 0 ? (
                                             <ul className="space-y-1">
                                               {Object.entries(scan1.leaf_counts).map(([color, count]) => (
                                                 <li key={color} className="capitalize">{color}: {count}</li>
                                               ))}
                                             </ul>
                                           ) : "-"}
                                         </td>
                                         <td className="py-3 px-4 text-slate-200 align-top">
                                           {Object.keys(scan2.leaf_counts || {}).length > 0 ? (
                                             <ul className="space-y-1">
                                               {Object.entries(scan2.leaf_counts).map(([color, count]) => (
                                                 <li key={color} className="capitalize">{color}: {count}</li>
                                               ))}
                                             </ul>
                                           ) : "-"}
                                         </td>
                                       </tr>
                                     </tbody>
                                   </table>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                <div className="text-center text-slate-500">
                                   <GitCompareArrows className="size-10 mx-auto mb-3 opacity-20" />
                                   <p className="text-sm">Need at least 2 scans to compare growth.</p>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                              <div className="text-center text-slate-500 text-sm">Select a plant to view history.</div>
                            </div>
                          )}
                       </div>
                     </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* RESULTS VIEW */}
          {viewState === "results" && result && (
            <div className="pt-6 animate-in fade-in duration-500 min-h-screen">
               {error && (
                  <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-400 shadow-sm">
                    {error}
                  </div>
               )}
               {modalNote && (
                 <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 flex items-start gap-3 shadow-sm">
                   <AlignJustify className="size-5 text-primary mt-0.5" />
                   <div>
                     <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">User Note</p>
                     <p className="text-slate-100 text-sm font-medium">{modalNote}</p>
                   </div>
                 </div>
               )}

               {detectionMode === "summary" ? (
                  /* Summary View */
                  <div className="flex flex-col gap-6 lg:flex-row min-h-[calc(100vh-160px)]">
                    <Card className="flex-1 flex flex-col border-white/10 bg-slate-900/40 overflow-hidden shadow-2xl rounded-xl">
                      <div className="p-2 flex-1 flex items-center justify-center">
                         {compositeUrl ? (
                           <img src={compositeUrl} alt="Analyzed" className="max-w-full max-h-[88vh] object-contain rounded-lg border border-white/5 shadow-inner" />
                         ) : (
                           <div className="aspect-video w-full bg-white/5 flex items-center justify-center rounded-lg border border-white/5 text-slate-500">No image available</div>
                         )}
                      </div>
                    </Card>
                    <div className="w-full lg:w-[350px] shrink-0">
                      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-md rounded-xl shadow-xl h-full flex flex-col">
                        <CardHeader className="border-b border-white/10 pb-4 bg-black/20 shrink-0">
                          <CardTitle className="text-lg font-bold text-white tracking-wide">Key Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1">
                           <dl className="space-y-4 text-sm">
                              {models.canopy && (
                                <div className="flex justify-between items-center rounded-lg bg-primary/10 px-4 py-4 border border-primary/20 shadow-sm">
                                  <dt className="text-primary-100 font-semibold">Canopy Area</dt>
                                  <dd className="font-mono font-bold text-white text-lg">{(result.canopyAreaM2 ?? result.canopyAreaCm2 / 10000).toFixed(4)} m²</dd>
                                </div>
                              )}
                              {models.fruit && (
                                <div className="flex justify-between items-center rounded-lg bg-amber-500/10 px-4 py-4 border border-amber-500/20 shadow-sm">
                                  <dt className="text-amber-100 font-semibold">Total Fruits</dt>
                                  <dd className="font-mono font-bold text-white text-lg">{result.fruitDetections.length}</dd>
                                </div>
                              )}
                              {models.leaf && (
                                <div className="flex justify-between items-center rounded-lg bg-cyan-500/10 px-4 py-4 border border-cyan-500/20 shadow-sm">
                                  <dt className="text-cyan-100 font-semibold">Total Leaves</dt>
                                  <dd className="font-mono font-bold text-white text-lg">{result.leaf.detectionCount}</dd>
                                </div>
                              )}
                           </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
               ) : (
                  /* Detailed View - Sequential Layout */
                  <div className="flex flex-col gap-12 pb-24">
                     
                     {/* Canopy Block */}
                     {models.canopy && result.canopyDetections.length > 0 && (
                       <div className="min-h-[calc(100vh-140px)] flex flex-col gap-6">
                         <h3 className="text-xl font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2"><Search className="size-5"/> Canopy Analysis</h3>
                         <div className="flex flex-col lg:flex-row gap-6 flex-1">
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2">
                              {detailedImages.canopy ? (
                                <img src={detailedImages.canopy} className="max-w-full max-h-[70vh] object-contain" />
                              ) : <div className="text-slate-500">Image processing...</div>}
                           </div>
                           <div className="w-full lg:w-[400px] shrink-0">
                             <Card className="border-emerald-500/20 bg-slate-900/40 backdrop-blur-md rounded-xl h-full">
                               <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 pb-4">
                                 <CardTitle className="text-emerald-100 text-lg">Metrics Table</CardTitle>
                               </CardHeader>
                               <CardContent className="pt-4">
                                  <div className="mb-6 flex justify-between items-center bg-emerald-500/20 px-4 py-3 rounded-lg border border-emerald-500/30">
                                    <span className="text-emerald-100 font-medium">Total Area</span>
                                    <span className="text-white font-mono font-bold text-lg">{(result.canopyAreaM2 ?? result.canopyAreaCm2 / 10000).toFixed(4)} m²</span>
                                  </div>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Individual Detections</p>
                                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    {result.canopyDetections.map((det, i) => (
                                      <div key={i} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 flex justify-between items-center">
                                         <span className="text-sm text-slate-200 capitalize">{det.label}</span>
                                         <span className="text-xs font-bold text-emerald-400">{(det.confidence * 100).toFixed(1)}%</span>
                                      </div>
                                    ))}
                                  </div>
                               </CardContent>
                             </Card>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Fruits Block */}
                     {models.fruit && result.fruitDetections.length > 0 && (
                       <div className="min-h-[calc(100vh-140px)] flex flex-col gap-6">
                         <h3 className="text-xl font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2"><Search className="size-5"/> Fruit Analysis</h3>
                         <div className="flex flex-col lg:flex-row gap-6 flex-1">
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2">
                              {detailedImages.fruit ? (
                                <img src={detailedImages.fruit} className="max-w-full max-h-[70vh] object-contain" />
                              ) : <div className="text-slate-500">Image processing...</div>}
                           </div>
                           <div className="w-full lg:w-[450px] shrink-0 flex flex-col">
                             <Card className="border-amber-500/20 bg-slate-900/40 backdrop-blur-md rounded-xl flex-1 flex flex-col">
                               <CardHeader className="bg-amber-500/10 border-b border-amber-500/20 pb-4 shrink-0">
                                 <CardTitle className="text-amber-100 text-lg">Classification Table</CardTitle>
                               </CardHeader>
                               <CardContent className="pt-4 flex-1 flex flex-col overflow-hidden">
                                  <div className="grid grid-cols-2 bg-black/40 rounded-t-lg border-b border-white/10 shrink-0">
                                     <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Classification</div>
                                     <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Confidence</div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-b-lg border border-t-0 border-white/10" style={{maxHeight: '350px'}}>
                                    <table className="w-full text-left">
                                      <tbody className="divide-y divide-white/5">
                                        {result.fruitDetections.map((det, i) => (
                                          <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-200 capitalize">
                                              {det.label} {det.color && <span className="text-slate-400 text-xs ml-1">({det.color})</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-amber-400 text-right">
                                              {(det.confidence * 100).toFixed(1)}%
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="text-xs text-slate-500 italic mt-3">Scroll table to view all fruits.</p>
                               </CardContent>
                             </Card>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Leaves Block */}
                     {models.leaf && result.leafDetections.length > 0 && (
                       <div className="min-h-[calc(100vh-140px)] flex flex-col gap-6">
                         <h3 className="text-xl font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2"><Search className="size-5"/> Leaf Analysis</h3>
                         <div className="flex flex-col lg:flex-row gap-6 flex-1">
                           <div className="flex-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2">
                              {detailedImages.leaf ? (
                                <img src={detailedImages.leaf} className="max-w-full max-h-[70vh] object-contain" />
                              ) : <div className="text-slate-500">Image processing...</div>}
                           </div>
                           <div className="w-full lg:w-[450px] shrink-0 flex flex-col">
                             <Card className="border-cyan-500/20 bg-slate-900/40 backdrop-blur-md rounded-xl flex-1 flex flex-col">
                               <CardHeader className="bg-cyan-500/10 border-b border-cyan-500/20 pb-4 shrink-0">
                                 <CardTitle className="text-cyan-100 text-lg">Classification Table</CardTitle>
                               </CardHeader>
                               <CardContent className="pt-4 flex-1 flex flex-col overflow-hidden">
                                  <div className="grid grid-cols-2 bg-black/40 rounded-t-lg border-b border-white/10 shrink-0">
                                     <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Classification</div>
                                     <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Confidence</div>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-b-lg border border-t-0 border-white/10" style={{maxHeight: '350px'}}>
                                    <table className="w-full text-left">
                                      <tbody className="divide-y divide-white/5">
                                        {result.leafDetections.map((det, i) => (
                                          <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-200 capitalize">
                                              {det.label} {det.color && <span className="text-slate-400 text-xs ml-1">({det.color})</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-cyan-400 text-right">
                                              {(det.confidence * 100).toFixed(1)}%
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="text-xs text-slate-500 italic mt-3">Scroll table to view all leaves.</p>
                               </CardContent>
                             </Card>
                           </div>
                         </div>
                       </div>
                     )}

                  </div>
               )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
