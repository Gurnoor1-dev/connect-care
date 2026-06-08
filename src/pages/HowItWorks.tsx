import { Brain, Sparkles, Zap, Shield } from "lucide-react";

const steps = [
  { i: Brain, t: "Cognitive load index", d: "A 10-question assessment maps career, anxiety, sleep and recovery signals." },
  { i: Sparkles, t: "Smart matching engine", d: "Specialists are ranked against your top stressor in real-time." },
  { i: Zap, t: "60-second flash dispatch", d: "We page our top match instantly; the next is auto-paged if needed." },
  { i: Shield, t: "Private & encrypted", d: "End-to-end encrypted sessions. No recordings, no phone numbers exchanged." },
];

export default function HowItWorks() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">How BreatheRise works</h1>
        <p className="mt-4 text-muted-foreground">
          From assessment to recovery in four calm steps.
        </p>
      </div>
      <ol className="mx-auto mt-16 max-w-3xl space-y-6">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-5 rounded-2xl border bg-card p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
              <s.i className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground">Step 0{i + 1}</div>
              <h3 className="mt-1 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted-foreground">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
