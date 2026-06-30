import { useState } from "react";
import { API } from "@/lib/api";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const PERIODS = [
  { id: "daily", label: "Daily", desc: "Today's meals" },
  { id: "weekly", label: "Weekly", desc: "Last 7 days" },
  { id: "monthly", label: "Monthly", desc: "Last 30 days" },
];

export default function Reports() {
  const [period, setPeriod] = useState("weekly");
  const [busy, setBusy] = useState(false);

  const download = async (kind) => {
    setBusy(true);
    try {
      const token = localStorage.getItem("foodai_token");
      const r = await fetch(`${API}/report/${kind}?period=${period}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error("Failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `food-report-${period}.${kind === "pdf" ? "pdf" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (e) {
      toast.error("Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Reports</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Export your nutrition data</h1>
        <p className="text-muted-foreground mt-1.5">Download summaries to share with your trainer or doctor.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 fade-up-1">
        {PERIODS.map((p) => (
          <button key={p.id} data-testid={`period-${p.id}`} onClick={() => setPeriod(p.id)}
            className={`text-left bg-white border rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-md ${
              period === p.id ? "ring-2 ring-primary border-primary" : ""
            }`}>
            <p className="font-display text-2xl tracking-tight">{p.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-3xl p-7 md:p-9 fade-up-2">
        <h3 className="font-display text-xl sm:text-2xl tracking-tight">Choose a format</h3>
        <p className="text-sm text-muted-foreground mt-1">Both include date, food, calories and macros.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <button data-testid="download-pdf" disabled={busy} onClick={() => download("pdf")}
            className="border rounded-2xl p-5 text-left hover:bg-secondary transition-colors disabled:opacity-60 inline-flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary grid place-items-center text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold">PDF report</p>
              <p className="text-xs text-muted-foreground">Formatted, ready to print</p>
            </div>
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>

          <button data-testid="download-csv" disabled={busy} onClick={() => download("csv")}
            className="border rounded-2xl p-5 text-left hover:bg-secondary transition-colors disabled:opacity-60 inline-flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary grid place-items-center text-primary">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold">CSV export</p>
              <p className="text-xs text-muted-foreground">Open in Excel or Google Sheets</p>
            </div>
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
