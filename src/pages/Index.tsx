import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

const supportAreas = [
  { icon: "🌿", label: "Stress & anxiety" },
  { icon: "🌙", label: "Sleep & recovery" },
  { icon: "💬", label: "Relationships" },
  { icon: "🎯", label: "Focus & confidence" },
  { icon: "🤍", label: "Life transitions" },
  { icon: "✨", label: "Personal growth" },
];

const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    desc: "Start with a short, thoughtful check-in about what has been on your mind lately.",
  },
  {
    number: "02",
    title: "Meet the right specialist",
    desc: "Explore vetted specialists and choose someone whose approach feels right for you.",
  },
  {
    number: "03",
    title: "Make space for yourself",
    desc: "Book a private session and build practical habits that support your everyday life.",
  },
];

const values = [
  {
    icon: HeartHandshake,
    title: "Human first",
    desc: "Support should feel warm, respectful and personal—not clinical or transactional.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    desc: "Your conversations and choices deserve a calm, secure space.",
  },
  {
    icon: Brain,
    title: "Thoughtful matching",
    desc: "Find support around your needs, goals and preferred way of working.",
  },
];

const testimonials = [
  {
    quote: "The whole experience felt calm from the first click. I finally found someone I could open up to.",
    name: "Priya S.",
    role: "BreatheRise member",
  },
  {
    quote: "It was refreshingly simple to understand who each specialist was and what they could help with.",
    name: "Marcus T.",
    role: "BreatheRise member",
  },
  {
    quote: "I liked that the focus was on my goals rather than putting a label on how I was feeling.",
    name: "Chen W.",
    role: "BreatheRise member",
  },
];

export default function Index() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,oklch(0.91_0.055_176/75%),transparent_32%),radial-gradient(circle_at_88%_12%,oklch(0.92_0.045_95/70%),transparent_28%)]" />
        <div className="absolute -right-28 top-24 -z-10 h-72 w-72 rounded-full bg-teal/15 blur-3xl" />
        <div className="absolute -left-24 bottom-0 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="container mx-auto grid items-center gap-12 pb-20 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-20 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/75 px-4 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Support for your whole self
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-7xl">
              Feel more like{" "}
              <span className="text-gradient-brand">yourself.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              BreatheRise connects you with thoughtful specialists for the moments
              when you want a little more clarity, confidence, calm or support.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-primary px-7 text-primary-foreground shadow-brand"
              >
                <Link to="/signup">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7">
                <Link to="/specialists">
                  Meet our specialists
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
              {["Private sessions", "Vetted specialists", "Flexible booking"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="relative mx-auto w-full max-w-[560px]"
          >
            <div className="relative overflow-hidden rounded-[2.25rem] border border-primary/10 bg-card p-4 shadow-[0_35px_80px_-45px_oklch(0.3_0.07_165/55%)]">
              <div className="rounded-[1.8rem] bg-secondary/65 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      A gentle starting point
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">What would help today?</h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {supportAreas.slice(0, 4).map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-primary p-5 text-primary-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">You don't have to figure it out alone.</p>
                      <p className="mt-0.5 text-xs text-primary-foreground/70">
                        Take the first small step when you're ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-border/70 bg-background/95 px-4 py-3 shadow-card sm:flex sm:items-center sm:gap-3">
              <div className="flex -space-x-2">
                {["P", "M", "C"].map((letter) => (
                  <span
                    key={letter}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-accent text-xs font-bold text-primary"
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold">A growing community</p>
                <p className="text-[11px] text-muted-foreground">finding better ways forward</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background py-10">
        <div className="container mx-auto">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Support for whatever season of life you're in
            </p>
            <div className="flex flex-wrap gap-2">
              {supportAreas.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border border-border/70 bg-secondary/45 px-3.5 py-2 text-xs font-medium text-foreground/80"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">How it works</p>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight md:text-5xl">
                A simpler way to find the right support.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                No pressure and no complicated process. Just a clear path from
                “I could use some help” to a conversation that feels useful.
              </p>
              <Button asChild variant="outline" className="mt-7 rounded-full">
                <Link to="/how-it-works">
                  See how it works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border/70 rounded-3xl border border-border/70 bg-card shadow-card">
              {steps.map((step) => (
                <div key={step.number} className="grid gap-4 p-7 sm:grid-cols-[72px_1fr] sm:p-9">
                  <div className="text-sm font-semibold text-primary">{step.number}</div>
                  <div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/45 py-20 md:py-28">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Why BreatheRise</p>
            <h2 className="mt-4 text-4xl font-semibold md:text-5xl">Care that feels human.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              We believe getting support should leave you feeling more grounded,
              not overwhelmed by the process.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-3xl border border-border/70 bg-background/80 p-7 shadow-card transition-transform hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
                  <value.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">{value.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Member stories</p>
              <h2 className="mt-4 text-4xl font-semibold md:text-5xl">Small steps can feel big.</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Real experiences from BreatheRise members
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="flex min-h-[250px] flex-col rounded-3xl border border-border/70 bg-card p-7 shadow-card"
              >
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-7 text-base leading-7 text-foreground/85">“{testimonial.quote}”</p>
                <div className="mt-auto pt-7">
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-7 py-14 text-primary-foreground sm:px-12 md:py-20">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-teal/25 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/65">
                  Start where you are
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
                  You deserve support that fits your life.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/70">
                  Meet specialists, explore your options and take the next step at your own pace.
                </p>
              </div>

              <Button asChild size="lg" className="h-12 rounded-full bg-background px-7 text-foreground hover:bg-background/90">
                <Link to="/signup">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
