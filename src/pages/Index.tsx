import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap, Brain, Star, Quote, Clock, Users, Award } from "lucide-react";

const testimonials = [
  {
    quote: "I booked a session within 2 minutes of signing up. My anxiety coach was exactly what I needed.",
    name: "Priya S.",
    role: "Startup Founder, Bengaluru",
    rating: 5,
  },
  {
    quote: "Sleep has never been this manageable. Dr. Berg understood my shift-work pattern immediately.",
    name: "Marcus T.",
    role: "ICU Nurse, London",
    rating: 5,
  },
  {
    quote: "Finally a platform that treats mental fitness the same way I treat physical fitness.",
    name: "Chen W.",
    role: "VP Engineering, Singapore",
    rating: 5,
  },
];

const features = [
  {
    icon: Brain,
    title: "Cognitive load index",
    desc: "Our 10-question assessment maps your exact stressors — career, anxiety, sleep, and beyond.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-500/10",
  },
  {
    icon: Sparkles,
    title: "Smart matching engine",
    desc: "Specialists are ranked against your top stressor in real-time. No browsing bios you don't need.",
    color: "from-sky-500 to-blue-600",
    bg: "bg-sky-500/10",
  },
  {
    icon: Zap,
    title: "Flash dispatch",
    desc: "We ping our top match instantly. If they don't accept in 60 seconds, the next is auto-paged.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Private & encrypted",
    desc: "End-to-end encrypted sessions. No phone numbers exchanged, no recordings stored.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
  },
];

const stats = [
  { value: "47s", label: "Avg. match time", icon: Clock },
  { value: "1,200+", label: "Vetted specialists", icon: Users },
  { value: "84K+", label: "Sessions delivered", icon: Award },
];

export default function Index() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Multi-layered gradient background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,oklch(0.52_0.13_235/30%),transparent_70%)]" />
        <div className="absolute -top-24 -right-32 -z-10 h-[600px] w-[600px] rounded-full bg-violet-500/15 blur-[100px]" />
        <div className="absolute -bottom-24 -left-32 -z-10 h-[500px] w-[500px] rounded-full bg-teal/20 blur-[120px]" />
        <div className="absolute top-40 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-[80px]" />

        <div className="container mx-auto px-4 pt-20 pb-28 text-center md:pt-32 md:pb-36">
          {/* Animated badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-teal/10 px-4 py-2 text-xs font-medium backdrop-blur"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-foreground/80">Specialists are online right now</span>
            <span className="rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold text-white">LIVE</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mx-auto mt-7 max-w-5xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            Breathe deeply.{" "}
            <span className="relative inline-block">
              <span className="text-gradient-brand">Rise higher.</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 10 C75 2, 225 2, 298 10" stroke="url(#ul)" strokeWidth="3" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="ul" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="oklch(0.52 0.13 235)"/>
                    <stop offset="1" stopColor="oklch(0.72 0.12 200)"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            Elite performance coaching for the modern executive. Vetted specialists matched in under a minute — discreet, encrypted, and results-driven.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 bg-gradient-brand px-8 text-base text-primary-foreground shadow-glow">
              <Link to="/signup">Get started free <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-white/20 px-8 text-base backdrop-blur hover:bg-white/5">
              <Link to="/specialists">Browse specialists</Link>
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mx-auto mt-16 flex max-w-2xl flex-col items-center justify-center gap-4 sm:flex-row"
          >
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur ${
                  i === 1 ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : ""
                }`}
              >
                <s.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                <div className="text-3xl font-bold text-gradient-brand md:text-4xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-accent/20 to-background py-28">
        <div className="absolute left-1/2 top-0 -z-10 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-block rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal">
              How it works
            </div>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Built for the modern mind.
            </h2>
            <p className="mt-4 text-muted-foreground">From first click to first session in minutes, not days.</p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                {/* Gradient accent top bar */}
                <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${f.color}`} />
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Step 0{idx + 1}
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPECIALITIES SHOWCASE ── */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">Every dimension of performance.</h2>
            <p className="mt-4 text-muted-foreground">Our specialists cover the full spectrum of high-performance challenges.</p>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Anxiety & Stress", emoji: "🧠", color: "from-violet-500/20 to-purple-500/10 border-violet-500/20" },
              { label: "Sleep & Recovery", emoji: "🌙", color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/20" },
              { label: "Leadership", emoji: "🎯", color: "from-amber-500/20 to-orange-500/10 border-amber-500/20" },
              { label: "Relationships", emoji: "💬", color: "from-rose-500/20 to-pink-500/10 border-rose-500/20" },
              { label: "Burnout & Focus", emoji: "⚡", color: "from-sky-500/20 to-cyan-500/10 border-sky-500/20" },
              { label: "Mindfulness", emoji: "🌿", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20" },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br ${item.color} p-5 text-center transition-transform hover:-translate-y-1`}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative overflow-hidden py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,oklch(0.72_0.12_200/8%),transparent_70%)]" />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-xl text-center">
            <div className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-500">
              Client stories
            </div>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">Trusted by leaders worldwide.</h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur"
              >
                <Quote className="mb-4 h-8 w-8 text-teal/40" />
                <p className="text-sm leading-relaxed text-foreground/85">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container mx-auto px-4 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-[1px]"
          style={{ background: "linear-gradient(135deg, oklch(0.52 0.13 235), oklch(0.72 0.12 200), oklch(0.78 0.16 145))" }}
        >
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-slate-950 to-slate-900 px-8 py-16 text-center md:px-16 md:py-20">
            {/* Decorative blobs */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-teal/20 blur-3xl" />
            <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative">
              <div className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                Get started today
              </div>
              <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-bold text-white md:text-5xl">
                Your next breath, <span className="text-gradient-brand">taken further.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-white/60">
                Join thousands of high performers who use BreatheRise for clarity, recovery and sustainable growth.
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="h-12 bg-gradient-brand px-10 text-base shadow-glow">
                  <Link to="/signup">Create your account <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 border-white/20 px-8 text-base text-white hover:bg-white/10">
                  <Link to="/specialists">Meet the specialists</Link>
                </Button>
              </div>
              <p className="mt-6 text-xs text-white/40">Free to sign up · No credit card required</p>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
