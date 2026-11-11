import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ArrowUpRight, Brain, CalendarCheck, Check, HeartHandshake,
  Leaf, LockKeyhole, MessageCircleHeart, MoonStar, ShieldCheck, Sparkles,
  Users, Video, Wind,
} from "lucide-react";

const supportAreas = [
  { icon: "✳", label: "Stress & anxiety" },
  { icon: "☾", label: "Sleep" },
  { icon: "↗", label: "Focus" },
  { icon: "♡", label: "Relationships" },
  { icon: "⌁", label: "Life changes" },
  { icon: "✺", label: "Personal growth" },
];

const careOptions = [
  { icon: HeartHandshake, title: "Therapy & counselling", tag: "Talk it through", tone: "bg-[#e5eee2]" },
  { icon: Brain, title: "Psychiatric support", tag: "Expert guidance", tone: "bg-[#e9e8d9]" },
  { icon: Users, title: "Relationship support", tag: "Grow together", tone: "bg-[#e7ece5]" },
  { icon: Sparkles, title: "Everyday wellbeing", tag: "Build steady habits", tone: "bg-[#f0e9dc]" },
];

const steps = [
  { icon: MessageCircleHeart, number: "01", title: "Tell us what you need", desc: "Start with what’s on your mind." },
  { icon: Users, number: "02", title: "Meet your specialist", desc: "Explore people and find a good fit." },
  { icon: CalendarCheck, number: "03", title: "Choose your session", desc: "Book a time that works for you." },
];

const trustPoints = [
  { icon: ShieldCheck, title: "A private space", desc: "Your journey is personal." },
  { icon: HeartHandshake, title: "Human-first care", desc: "You are more than a checklist." },
  { icon: Video, title: "Flexible sessions", desc: "Support that fits your routine." },
];

export default function Index() {
  return (
    <div className="br-home">
      <section className="relative overflow-hidden bg-[#f4f3e9] dark:bg-[#13271e]">
        <div className="container mx-auto grid min-h-[600px] items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_.95fr] lg:gap-10 lg:py-20">
          <div className="relative z-10 max-w-2xl py-4">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b9cbb8] bg-white/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#315b49] dark:bg-white/5 dark:text-[#dcebd8]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dbe7d7] dark:bg-[#294737]"><Leaf className="h-3.5 w-3.5" /></span>
              A little more room to be you
            </div>
            <h1 className="max-w-[680px] font-display text-[3.4rem] font-medium leading-[.98] tracking-[-.075em] text-[#183e32] dark:text-[#e1eadc] sm:text-7xl lg:text-[5.35rem]">
              Feel better,<br />one <span className="font-serif italic font-normal text-[#65836a] dark:text-[#a5c4a4]">step</span> at a time.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#52685b] dark:text-[#c0d0c2] sm:text-lg">
              Find thoughtful mental health support, meet a specialist and take your next step with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full bg-[#204b3b] px-7 text-white shadow-none hover:bg-[#163a2d]">
                <Link to="/specialists">Find a specialist <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#b8c9b8] bg-transparent px-7 text-[#204b3b] hover:bg-[#e7ebdf]">
                <Link to="/how-it-works">See how it works <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-[#52685b] dark:text-[#c0d0c2]">
              {["Private", "Specialist-led", "Flexible"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#4d765d]" />{item}</span>)}
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[390px] w-full max-w-[560px] items-center justify-center sm:min-h-[490px]">
            <div className="absolute inset-[8%] rounded-[48%_52%_46%_54%/45%_42%_58%_55%] bg-[#dce7d6] dark:bg-[#263f30]" />
            <div className="absolute inset-[16%] rounded-full border border-[#91ae94]/70" />
            <div className="absolute inset-[25%] rounded-full border border-[#91ae94]/70" />
            <div className="relative z-10 flex h-44 w-44 flex-col items-center justify-center rounded-full bg-[#204b3b] text-center text-[#f4f3e9] shadow-[0_24px_60px_-28px_rgba(24,62,50,.5)] sm:h-52 sm:w-52">
              <Wind className="mb-3 h-9 w-9 stroke-[1.25]" />
              <span className="font-serif text-3xl italic">breathe in.</span>
              <span className="mt-1 text-[10px] uppercase tracking-[.2em] text-[#cbdac9]">begin where you are</span>
            </div>
            <div className="absolute right-0 top-[10%] z-20 flex max-w-[180px] items-center gap-3 rounded-2xl border border-[#d4ddcf] bg-[#fffdf5] p-3 shadow-lg dark:border-[#58775d] dark:bg-[#263d2e] sm:right-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e1eadc] text-[#315b49]"><HeartHandshake className="h-5 w-5" /></span>
              <span className="text-xs font-semibold leading-5 text-[#244637] dark:text-[#edf3e8]">Support that starts with you</span>
            </div>
            <div className="absolute bottom-[8%] left-0 z-20 flex max-w-[190px] items-center gap-3 rounded-2xl border border-[#d4ddcf] bg-[#fffdf5] p-3 shadow-lg dark:border-[#58775d] dark:bg-[#263d2e] sm:left-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9e8d9] text-[#315b49]"><CalendarCheck className="h-5 w-5" /></span>
              <span className="text-xs font-semibold leading-5 text-[#244637] dark:text-[#edf3e8]">Your pace. Your next step.</span>
            </div>
          </div>
        </div>
        <div className="border-t border-[#d7dfd1] dark:border-[#365341]">
          <div className="container mx-auto flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#587060] dark:text-[#b9cfb5]">Here for what’s on your mind</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{supportAreas.map((item) => <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[#365746] dark:text-[#d0dfcf]"><span className="text-base text-[#78977c]">{item.icon}</span>{item.label}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="bg-[#204b3b] py-16 text-[#f4f3e9] sm:py-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b9cfb5]">A simple path forward</p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-[-.055em] sm:text-5xl">Getting started is easier than you think.</h2>
          </div>
          <div className="relative mt-12 grid gap-5 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[17%] right-[17%] top-12 hidden border-t border-dashed border-[#9fba9e]/60 md:block" />
            {steps.map((step) => <article key={step.number} className="relative z-10 rounded-[1.5rem] border border-white/15 bg-white/[.06] p-6 text-center sm:p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#a9c3a8]/50 bg-[#315d49] text-[#e6efe1] shadow-[0_12px_30px_-18px_rgba(0,0,0,.5)]"><step.icon className="h-8 w-8 stroke-[1.5]" /></div>
              <p className="mt-5 text-[10px] font-bold tracking-[.2em] text-[#a9c3a8]">STEP {step.number}</p>
              <h3 className="mt-2 text-xl font-medium">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-[230px] text-sm leading-6 text-[#d1dfd1]">{step.desc}</p>
            </article>)}
          </div>
          <div className="mt-9 text-center"><Button asChild variant="outline" className="rounded-full border-[#8eaa93] bg-transparent text-[#f4f3e9] hover:bg-white/10 hover:text-white"><Link to="/how-it-works">Explore the process <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-primary">Find the support that fits</p><h2 className="mt-3 max-w-xl font-display text-4xl font-medium leading-tight tracking-[-.06em] sm:text-5xl">One place. Different ways to feel supported.</h2></div>
            <Link to="/specialists" className="inline-flex items-center text-sm font-semibold text-[#315b49]">Meet our specialists <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {careOptions.map((option, index) => <Link key={option.title} to="/specialists" className="group flex min-h-[220px] flex-col rounded-[1.5rem] border border-[#d4ddcf] bg-[#fbfaf4] p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(24,62,50,.4)] dark:bg-[#1a3025]">
              <div className="flex items-start justify-between"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${option.tone} text-[#315b49]`}><option.icon className="h-6 w-6" /></span><span className="font-serif text-sm italic text-[#7d9580]">0{index+1}</span></div>
              <p className="mt-6 text-[9px] font-bold uppercase tracking-[.18em] text-[#718273]">{option.tag}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-[#244637] dark:text-[#e4eee2]">{option.title}</h3>
              <span className="mt-auto inline-flex items-center pt-5 text-sm font-semibold text-[#315b49] dark:text-[#b9d5b4]">Explore <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>)}
          </div>
        </div>
      </section>

      <section className="bg-[#e8ede2] py-16 sm:py-20 dark:bg-[#1a3025]">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#587060] dark:text-[#b9cfb5]">The BreatheRise difference</p><h2 className="mt-3 font-display text-4xl font-medium tracking-[-.06em] text-[#204b3b] dark:text-[#e1eadc] sm:text-5xl">Care that feels human.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {trustPoints.map((point) => <article key={point.title} className="flex items-center gap-4 rounded-2xl border border-[#bdcdbb] bg-white/55 p-5 dark:border-[#365341] dark:bg-white/[.04] sm:p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#dce8d8] text-[#315b49] dark:bg-[#294737] dark:text-[#dcebd8]"><point.icon className="h-6 w-6" /></span>
              <span><strong className="block text-base font-semibold text-[#204b3b] dark:text-[#e1eadc]">{point.title}</strong><span className="mt-1 block text-sm text-[#607466] dark:text-[#c0d0c2]">{point.desc}</span></span>
            </article>)}
          </div>
        </div>
      </section>

      <section className="pb-14 pt-16 sm:pb-20 sm:pt-20">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#183e32] px-6 py-12 text-[#f4f3e9] sm:px-10 sm:py-16 lg:px-14">
            <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/15" /><div className="pointer-events-none absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/15" /><div className="pointer-events-none absolute -right-12 -top-8 h-32 w-32 rounded-full bg-[#7c9d79]/30 blur-2xl" />
            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b9cfb5]">Start where you are</p><h2 className="mt-3 font-display text-4xl font-medium leading-tight tracking-[-.06em] sm:text-5xl">Your next step can start today.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-[#d1dfd1]">Explore specialists and find the support that feels right.</p></div><Button asChild size="lg" className="h-12 rounded-full bg-[#f4f3e9] px-7 text-[#204b3b] shadow-none hover:bg-white"><Link to="/specialists">Find your specialist <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
