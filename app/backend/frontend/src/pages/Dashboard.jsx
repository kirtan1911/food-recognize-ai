import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Flame, Drumstick, Wheat, Droplet, ImagePlus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function MacroCard({ icon: Icon, label, value, unit, color, testid }) {
  return (
    <div data-testid={testid} className="bg-white border rounded-3xl p-6 hover:-translate-y-1 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl grid place-items-center`} style={{ background: color + "22", color }}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold mt-5">{value}<span className="text-base text-muted-foreground font-normal ml-1">{unit}</span></p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-muted-foreground">Loading dashboard…</div>;

  const pct = Math.min(100, (data.daily_calories / Math.max(1, data.daily_calorie_target)) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 fade-up">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Today</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Hello, {(user?.name || "friend").split(" ")[0]}.</h1>
          <p className="text-muted-foreground mt-1.5">Here's how your day is shaping up.</p>
        </div>
        <Link to="/scan" data-testid="cta-scan" className="bg-primary text-white px-6 py-3 rounded-full font-medium hover:-translate-y-1 transition-transform inline-flex items-center gap-2">
          <ImagePlus className="w-4 h-4" /> Scan a meal
        </Link>
      </div>

      {/* Hero progress */}
      <div className="bg-white border rounded-3xl p-7 md:p-10 fade-up-1">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-1">
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Daily progress</p>
            <p className="font-display text-5xl md:text-6xl font-bold mt-3 text-primary">{Math.round(data.daily_calories)}</p>
            <p className="text-sm text-muted-foreground mt-1">of {data.daily_calorie_target} kcal target</p>
            <p data-testid="remaining-calories" className="mt-4 inline-block text-xs bg-secondary px-3 py-1.5 rounded-full">
              {data.remaining_calories > 0 ? `${Math.round(data.remaining_calories)} kcal left` : `${Math.round(-data.remaining_calories)} kcal over`}
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#2C4C3B,#8DAA91)" }} />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { l: "Breakfast", v: data.by_meal.breakfast },
                { l: "Lunch", v: data.by_meal.lunch },
                { l: "Dinner", v: data.by_meal.dinner },
                { l: "Snack", v: data.by_meal.snack },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl bg-secondary py-4 text-center">
                  <p className="font-display text-2xl font-bold">{Math.round(m.v)}</p>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 fade-up-2">
        <MacroCard icon={Flame} label="Calories" value={Math.round(data.daily_calories)} unit="kcal" color="#2C4C3B" testid="macro-calories" />
        <MacroCard icon={Drumstick} label="Protein" value={Math.round(data.protein)} unit="g" color="#D96C4A" testid="macro-protein" />
        <MacroCard icon={Wheat} label="Carbs" value={Math.round(data.carbs)} unit="g" color="#E6B87A" testid="macro-carbs" />
        <MacroCard icon={Droplet} label="Fat" value={Math.round(data.fat)} unit="g" color="#8DAA91" testid="macro-fat" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 fade-up-3">
        <div className="lg:col-span-2 bg-white border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Last 7 days</p>
              <h3 className="font-display text-xl sm:text-2xl tracking-tight">Calorie trend</h3>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.weekly}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} stroke="#5C7365" />
                <YAxis fontSize={11} stroke="#5C7365" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8EAE6" }} />
                <Line type="monotone" dataKey="calories" stroke="#2C4C3B" strokeWidth={3} dot={{ r: 4, fill: "#D96C4A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-6">
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Recognitions</p>
          <p data-testid="recognition-count" className="font-display text-5xl font-bold mt-3">{data.recognition_count}</p>
          <p className="text-sm text-muted-foreground mt-1">meals logged with AI</p>
          <div className="h-32 mt-4">
            <ResponsiveContainer>
              <BarChart data={data.monthly.slice(-14)}>
                <Bar dataKey="calories" fill="#8DAA91" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-white border rounded-3xl p-6 fade-up-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl sm:text-2xl tracking-tight">Today's meals</h3>
          <Link to="/history" data-testid="link-all-history" className="text-sm text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {data.today_items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No meals logged today yet. <Link to="/scan" className="text-primary underline">Scan one</Link>.</p>
        ) : (
          <div className="space-y-2">
            {data.today_items.map((m) => (
              <div key={m.id} data-testid={`today-meal-${m.id}`} className="flex items-center gap-4 p-3 hover:bg-secondary rounded-2xl transition-colors">
                {m.image_b64 ? (
                  <img src={`data:image/jpeg;base64,${m.image_b64}`} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent/20 grid place-items-center text-primary font-display">{m.food_name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.food_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.meal_type} · {m.created_at.slice(11, 16)}</p>
                </div>
                <p className="font-display font-semibold">{Math.round(m.calories)} kcal</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
