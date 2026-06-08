export default function About() {
  return (
    <section className="container mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-bold md:text-5xl">About BreatheRise</h1>
      <p className="mt-6 text-lg text-muted-foreground">
        BreatheRise is built for the modern mind — a calm, private network of vetted
        specialists for executives and high-performers who need clarity, recovery and growth.
      </p>
      <p className="mt-4 text-muted-foreground">
        Our mission is simple: <span className="text-foreground font-medium">Breathe deeply. Rise higher.</span>
        We pair you with the right coach in under a minute, on a fully encrypted call,
        no recordings, no phone numbers exchanged.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { v: "47s", l: "Avg. match time" },
          { v: "1,200+", l: "Vetted specialists" },
          { v: "84,000+", l: "Sessions delivered" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-6 text-center">
            <div className="text-3xl font-bold text-gradient-brand">{s.v}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
