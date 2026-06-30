import { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Camera, Upload, Sparkles, X, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export default function Scan() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState(defaultMealType());
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => () => stopCam(), []);

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCam = async () => {
    try {
      stopCam();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      toast.error("Camera not available. Use Upload instead.");
    }
  };

  useEffect(() => {
    if (tab === "webcam") startCam();
    else stopCam();
  }, [tab]);

  const captureFromWebcam = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    const f = new File([blob], "capture.jpg", { type: "image/jpeg" });
    setFile(f);
    setPreviewUrl(URL.createObjectURL(blob));
    stopCam();
    setTab("preview");
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setTab("preview");
  };

  const reset = () => {
    setFile(null); setResult(null); setPreviewUrl(null); setTab("upload");
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/predict", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await api.post("/history", {
        food_name: result.food_name,
        confidence: Number(result.confidence) || 0,
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        fiber: Number(result.fiber) || 0,
        sugar: Number(result.sugar) || 0,
        sodium: Number(result.sodium) || 0,
        serving_size: result.serving_size || "",
        healthy_score: Number(result.healthy_score) || 0,
        meal_type: mealType,
        image_b64: result.image_b64,
        items: result.items || [],
      });
      toast.success("Saved to your history!");
      nav("/dashboard");
    } catch (e) {
      toast.error("Could not save meal");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Scan</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">What did you eat?</h1>
        <p className="text-muted-foreground mt-1.5">Upload a photo or use your camera. AI does the rest.</p>
      </div>

      {!result && (
        <div className="bg-white border rounded-3xl overflow-hidden fade-up-1">
          {!previewUrl && (
            <div className="flex border-b">
              {[
                { id: "upload", icon: Upload, label: "Upload" },
                { id: "webcam", icon: Camera, label: "Webcam" },
              ].map((t) => (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-4 inline-flex items-center justify-center gap-2 text-sm transition-colors ${
                    tab === t.id ? "text-primary border-b-2 border-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === "upload" && !previewUrl && (
            <label className="block p-12 cursor-pointer hover:bg-secondary/50 transition-colors">
              <input data-testid="upload-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
              <div className="border-2 border-dashed border-border rounded-3xl py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/30 grid place-items-center mx-auto mb-5">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <p className="font-display text-xl">Drop or browse</p>
                <p className="text-sm text-muted-foreground mt-1">JPG / PNG / WEBP · up to 10MB</p>
              </div>
            </label>
          )}

          {tab === "webcam" && !previewUrl && (
            <div className="p-6">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="mt-5 flex justify-center">
                <button data-testid="capture-btn" onClick={captureFromWebcam} className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </div>
            </div>
          )}

          {previewUrl && (
            <div>
              <img src={previewUrl} alt="preview" className="w-full max-h-[55vh] object-cover" />
              <div className="p-6 flex flex-wrap items-center gap-3">
                <button data-testid="analyze-btn" onClick={analyze} disabled={analyzing}
                  className="bg-primary text-white px-6 py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> {analyzing ? "Analyzing…" : "Analyze with AI"}
                </button>
                <button data-testid="retake-btn" onClick={reset} className="border bg-white px-6 py-3 rounded-full font-medium hover:bg-secondary inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Different photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div data-testid="result-card" className="bg-white border rounded-3xl overflow-hidden fade-up">
          {result.image_b64 && (
            <img src={`data:image/jpeg;base64,${result.image_b64}`} alt={result.food_name}
              className="w-full max-h-[40vh] object-cover" />
          )}
          <div className="p-7 md:p-9">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Detected</p>
                <h2 data-testid="result-food-name" className="font-display text-3xl sm:text-4xl tracking-tight mt-2">{result.food_name}</h2>
                <p className="text-sm text-muted-foreground mt-2">{result.serving_size || ""} · {result.prediction_time}s · {Math.round((result.confidence || 0) * 100)}% match</p>
              </div>
              <div className="text-right">
                <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Healthy score</p>
                <p data-testid="healthy-score" className="font-display text-5xl font-bold text-primary mt-2">{result.healthy_score}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7">
              {[
                { l: "Calories", v: Math.round(result.calories || 0), u: "kcal" },
                { l: "Protein", v: Math.round(result.protein || 0), u: "g" },
                { l: "Carbs", v: Math.round(result.carbs || 0), u: "g" },
                { l: "Fat", v: Math.round(result.fat || 0), u: "g" },
                { l: "Fiber", v: Math.round(result.fiber || 0), u: "g" },
                { l: "Sugar", v: Math.round(result.sugar || 0), u: "g" },
                { l: "Sodium", v: Math.round(result.sodium || 0), u: "mg" },
                { l: "Confidence", v: Math.round((result.confidence || 0) * 100), u: "%" },
              ].map((m) => (
                <div key={m.l} className="bg-secondary rounded-2xl py-4 px-4">
                  <p className="font-display text-2xl font-bold">{m.v}<span className="text-sm text-muted-foreground font-normal ml-1">{m.u}</span></p>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">{m.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t pt-6">
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-3">Save as</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m}
                    data-testid={`meal-type-${m}`}
                    onClick={() => setMealType(m)}
                    className={`px-5 py-2 rounded-full text-sm capitalize transition-all ${
                      mealType === m ? "bg-primary text-white" : "bg-secondary text-foreground/70 hover:bg-secondary/70"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button data-testid="save-meal-btn" onClick={save} className="bg-primary text-white px-7 py-3 rounded-full font-medium hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Save meal
              </button>
              <button data-testid="discard-btn" onClick={reset} className="border bg-white px-7 py-3 rounded-full font-medium hover:bg-secondary inline-flex items-center gap-2">
                <X className="w-4 h-4" /> Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
