import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

function groupByDay(items) {
  const map = {};
  items.forEach((i) => {
    const d = i.created_at.slice(0, 10);
    (map[d] ||= []).push(i);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

const MEAL_COLOR = {
  breakfast: "#E6B87A",
  lunch: "#D96C4A",
  dinner: "#2C4C3B",
  snack: "#8DAA91",
};

export default function History() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await api.get("/history");
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this meal?")) return;
    await api.delete(`/history/${id}`);
    setItems((s) => s.filter((i) => i.id !== id));
    toast.success("Meal removed");
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.meal_type === filter);
  const groups = groupByDay(filtered);

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Timeline</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Your meal journal</h1>
        <p className="text-muted-foreground mt-1.5">Every plate, every day. No judgment.</p>
      </div>

      <div className="flex flex-wrap gap-2 fade-up-1">
        {["all", "breakfast", "lunch", "dinner", "snack"].map((m) => (
          <button
            key={m}
            data-testid={`filter-${m}`}
            onClick={() => setFilter(m)}
            className={`px-5 py-2 rounded-full text-sm capitalize transition-all ${
              filter === m ? "bg-primary text-white" : "bg-white border text-foreground/70 hover:bg-secondary"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center text-muted-foreground">
          No meals logged yet. Try scanning your next meal.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, list]) => {
            const total = list.reduce((s, i) => s + (i.calories || 0), 0);
            return (
              <div key={day} className="fade-up-2">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-display text-xl sm:text-2xl tracking-tight">{new Date(day).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</h3>
                  <p className="text-sm text-muted-foreground">{Math.round(total)} kcal · {list.length} meals</p>
                </div>
                <div className="relative pl-6 border-l-2 border-border">
                  {list.map((m) => (
                    <div key={m.id} data-testid={`history-item-${m.id}`} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[31px] top-2 w-4 h-4 rounded-full border-4 border-background" style={{ background: MEAL_COLOR[m.meal_type] }} />
                      <div className="bg-white border rounded-3xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all">
                        {m.image_b64 ? (
                          <img src={`data:image/jpeg;base64,${m.image_b64}`} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-accent/20 grid place-items-center text-primary font-display text-xl">{m.food_name[0]}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{m.food_name}</p>
                            <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full" style={{ background: MEAL_COLOR[m.meal_type] + "22", color: MEAL_COLOR[m.meal_type] }}>{m.meal_type}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(m.calories)} kcal · P {Math.round(m.protein)}g · C {Math.round(m.carbs)}g · F {Math.round(m.fat)}g
                          </p>
                        </div>
                        <button data-testid={`delete-meal-${m.id}`} onClick={() => remove(m.id)} className="p-2.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
