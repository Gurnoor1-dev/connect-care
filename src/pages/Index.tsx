import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap, Brain } from "lucide-react";

export default function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 via-background to-background" />
        <div className="absolute -top-32 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-teal/20 blur-3xl" />
        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            Specialists online now
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            Breathe deeply. <br />
            <span className="text-gradient-brand">Rise higher.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Elite performance coaching for global executives. Vetted specialists,
            discreet sessions, measurable results.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground shadow-brand">
              <Link to="/signup">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/specialists">Browse specialists</Link>
            </Button>
          </motion.div>

          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-4 text-left">
            {[
              { v: "47s", l: "Avg. match time" },
              { v: "1,200+", l: "Vetted specialists" },
              { v: "84,000+", l: "Sessions delivered" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border bg-card/60 p-5 backdrop-blur">
                <div className="text-3xl font-bold text-gradient-brand md:text-4xl">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-teal">How it works</div>
          <h2 className="mt-2 text-4xl font-bold md:text-5xl">Built for the modern mind.</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: Brain, t: "Cognitive load index", d: "Our 10-question assessment maps the precise dimensions of your mental strain — career, anxiety, sleep, and beyond." },
            { i: Sparkles, t: "Smart matching engine", d: "Specialists are ranked against your top stressor in real-time. No browsing through bios you don't need." },
            { i: Zap, t: "Flash dispatch", d: "We ping our top-matched specialist instantly. If they don't accept in 60s, the next one is paged automatically." },
            { i: Shield, t: "Private & encrypted", d: "Every session is end-to-end encrypted. No phone numbers exchanged, no recordings stored — only you and your specialist." },
          ].map((f, idx) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:shadow-brand"
            >
              <div className="absolute right-4 top-4 text-xs font-mono text-muted-foreground">0{idx + 1}</div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center text-primary-foreground shadow-glow md:p-16">
          <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
          <h2 className="relative text-3xl font-bold md:text-5xl">Your next breath, taken further.</h2>
          <p className="relative mx-auto mt-4 max-w-xl opacity-90">
            Join thousands of leaders who trust BreatheRise for clarity, recovery and growth.
          </p>
          <div className="relative mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link to="/signup">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
