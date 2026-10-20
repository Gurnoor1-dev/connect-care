import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Brain, Check, HeartHandshake,
  Leaf, LockKeyhole, MoonStar, Sparkles, Star, Users, Wind, Sun,
} from "lucide-react";

const supportAreas = [
  { icon: "✳", label: "Stress & anxiety" },
  { icon: "☾", label: "Sleep & recovery" },
  { icon: "↗", label: "Focus & confidence" },
  { icon: "♡", label: "Relationships" },
  { icon: "⌁", label: "Life transitions" },
  { icon: "✺", label: "Personal growth" },
];

const steps = [
  { number: "01", title: "Start with what’s on your mind", desc: "A small first step is enough. Explore the kind of support you’re looking for, without needing all the answers." },
  { number: "02", title: "Find a person who feels right", desc: "Get to know specialists, their experience and their approach, then choose the one that fits you." },
  { number: "03", title: "Make room for a better rhythm", desc: "Choose a session and time that works for you, and keep moving forward at your own pace." },
];

const values = [
  { icon: HeartHandshake, title: "People before process", desc: "A warm, thoughtful experience that treats you as a whole person—not a checklist." },
  { icon: LockKeyhole, title: "Your space stays yours", desc: "Privacy-minded choices and clear information at every step of your journey." },
  { icon: Brain, title: "Support that fits", desc: "Explore specialists and approaches around your needs, goals and preferences." },
];

const careOptions = [
  { icon: HeartHandshake, number: "01", title: "Therapy & counselling", description: "A space to untangle thoughts, talk things through and feel heard.", tag: "Talk it through" },
  { icon: Brain, number: "02", title: "Psychiatric support", description: "Professional guidance for mental health concerns, with care and clarity.", tag: "Expert guidance" },
  { icon: Users, number: "03", title: "Relationship support", description: "Build better communication, navigate change and feel more connected.", tag: "Grow together" },
  { icon: Sparkles, number: "04", title: "Everyday wellbeing", description: "Practical support for resilience, self-awareness and steadier routines.", tag: "Small steps matter" },
];

const testimonials = [
  { quote: "The whole experience felt calm from the first click. I finally found someone I could open up to.", name: "Priya S.", role: "BreatheRise member" },
  { quote: "It was refreshingly simple to understand who each specialist was and what they could help with.", name: "Marcus T.", role: "BreatheRise member" },
  { quote: "I liked that the focus was on my goals rather than putting a label on how I was feeling.", name: "Chen W.", role: "BreatheRise member" },
];

export default function Index() {
  return (
    <div className="br-home">
      <section className="relative overflow-hidden bg-[#f4f3e9] dark:bg-[#13271e]">
        <div className="container mx-auto grid min-h-[660px] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:py-20">
          <div className="relative z-10 max-w-2xl py-4 lg:py-8">
            <div className="mb-8 inline-flex items-center gap-2 border-b border-[#315b49]/25 pb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#315b49]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#dbe7d7]"><Leaf className="h-3.5 w-3.5" /></span>
              A little more room to be you
            </div>
            <h1 className="max-w-[700px] font-display text-[3.6rem] font-medium leading-[.98] tracking-[-.075em] text-[#183e32] dark:text-[#e1eadc] sm:text-7xl lg:text-[5.7rem]">
              Make space<br />for <span className="font-serif italic font-normal text-[#65836a] dark:text-[#a5c4a4]">yourself.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#52685b] dark:text-[#c0d0c2] sm:text-lg sm:leading-8">
              Life can get loud. BreatheRise helps you find thoughtful support for the moments you need more calm, clarity or connection.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full bg-[#204b3b] px-7 text-white shadow-none hover:bg-[#163a2d]">
                <Link to="/specialists">Find your specialist <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-[#b8c9b8] bg-transparent px-7 text-[#204b3b] hover:bg-[#e7ebdf]">
                <Link to="/how-it-works">How it works <ArrowDownRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-[#52685b] dark:text-[#c0d0c2]">
              {["Private sessions", "Thoughtful specialists", "Flexible booking"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#4d765d]" />{item}</span>)}
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[450px] w-full max-w-[570px] items-center justify-center sm:min-h-[540px]">
            <div className="absolute left-[7%] top-[8%] h-[80%] w-[86%] rounded-[48%_52%_46%_54%/45%_42%_58%_55%] bg-[#dce7d6] dark:bg-[#263f30]" />
            <div className="absolute left-[16%] top-[15%] h-[66%] w-[70%] rounded-[50%] border border-[#91ae94]/70 dark:border-[#729578]/70" />
            <div className="absolute left-[24%] top-[23%] h-[50%] w-[54%] rounded-[50%] border border-[#91ae94]/70" />
            <div className="absolute left-[32%] top-[31%] h-[34%] w-[38%] rounded-[50%] bg-[#b5cbb4]/60 dark:bg-[#45694d]/70" />
            <div className="relative z-10 flex h-52 w-52 flex-col items-center justify-center rounded-full bg-[#204b3b] text-center text-[#f4f3e9] shadow-[0_24px_60px_-28px_rgba(24,62,50,.5)] sm:h-60 sm:w-60">
              <Wind className="mb-3 h-8 w-8 stroke-[1.25]" />
              <span className="font-serif text-3xl italic">breathe in.</span>
              <span className="mt-1 text-[10px] uppercase tracking-[.22em] text-[#cbdac9]">begin where you are</span>
            </div>
            <div className="absolute right-0 top-[12%] z-20 max-w-[190px] rounded-2xl border border-[#d4ddcf] bg-[#fffdf5] p-4 shadow-[0_18px_40px_-28px_rgba(24,62,50,.35)] dark:border-[#58775d] dark:bg-[#263d2e] sm:right-1">
              <div className="flex items-center gap-2 text-[#315b49] dark:text-[#b9d5b4]"><MoonStar className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[.15em]">A gentle reminder</span></div>
              <p className="mt-2 font-serif text-lg leading-snug text-[#244637] dark:text-[#edf3e8]">You don’t have to solve everything today.</p>
            </div>
            <div className="absolute bottom-[9%] left-0 z-20 max-w-[205px] rounded-2xl border border-[#d4ddcf] bg-[#fffdf5] p-4 shadow-[0_18px_40px_-28px_rgba(24,62,50,.35)] dark:border-[#58775d] dark:bg-[#263d2e] sm:left-2">
              <div className="flex items-center gap-1 text-[#b18a4b]">{Array.from({length:5}).map((_,i)=><Star key={i} className="h-3 w-3 fill-current" />)}</div>
              <p className="mt-2 text-sm font-medium leading-5 text-[#244637] dark:text-[#edf3e8]">“A calmer way to take the first step.”</p>
              <p className="mt-2 text-[10px] uppercase tracking-[.14em] text-[#718273] dark:text-[#b4c8b2]">The BreatheRise approach</p>
            </div>
            <span className="absolute bottom-[15%] right-[8%] z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#e6cfa3] text-[#315b49]"><Sun className="h-5 w-5" /></span>
          </div>
        </div>
        <div className="border-t border-[#d7dfd1] dark:border-[#365341]">
          <div className="container mx-auto flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#587060] dark:text-[#b9cfb5]">Whatever season you’re in</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{supportAreas.map((item) => <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[#365746] dark:text-[#d0dfcf]"><span className="text-base text-[#78977c]">{item.icon}</span>{item.label}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="bg-[#204b3b] py-16 text-[#f4f3e9] sm:py-20">
        <div className="container mx-auto grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="max-w-lg">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b9cfb5]">A different kind of starting point</p>
            <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-[-.055em] sm:text-5xl">You don’t need a perfect plan. Just a first step.</h2>
            <p className="mt-5 text-sm leading-7 text-[#d1dfd1]">Finding support shouldn’t feel like another thing to figure out. Keep it simple, stay in control, and move at a pace that feels right.</p>
            <Button asChild variant="outline" className="mt-7 rounded-full border-[#8eaa93] bg-transparent text-[#f4f3e9] hover:bg-white/10 hover:text-white"><Link to="/how-it-works">Get to know the process <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {steps.map((step) => <div key={step.number} className="grid gap-3 py-6 sm:grid-cols-[65px_1fr] sm:gap-6 sm:py-7"><span className="font-serif text-3xl italic text-[#a9c3a8]">{step.number}</span><div><h3 className="text-xl font-medium">{step.title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#d1dfd1]">{step.desc}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="container mx-auto">
          <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-primary">Ways to feel supported</p><h2 className="mt-4 max-w-xl font-display text-4xl font-medium leading-tight tracking-[-.06em] sm:text-5xl">Care for the person you are—not just the moment you’re in.</h2></div>
            <p className="max-w-md pb-1 text-sm leading-7 text-muted-foreground md:justify-self-end">Everyone’s story is different. Explore the kind of support that feels right, then connect with a specialist at your own pace.</p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[1.6rem] border border-[#d4ddcf] bg-[#d4ddcf] sm:grid-cols-2 xl:grid-cols-4">
            {careOptions.map((option) => <article key={option.title} className="group flex min-h-[285px] flex-col bg-[#fbfaf4] p-6 transition-colors hover:bg-[#edf1e7] sm:p-7"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e1eadc] text-[#315b49]"><option.icon className="h-5 w-5" /></span><span className="font-serif text-sm italic text-[#7d9580]">{option.number}</span></div><p className="mt-7 text-[9px] font-bold uppercase tracking-[.18em] text-[#718273]">{option.tag}</p><h3 className="mt-2 text-xl font-medium tracking-tight text-[#244637]">{option.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-[#66796b]">{option.description}</p><Link to="/specialists" className="mt-5 inline-flex items-center text-sm font-semibold text-[#315b49]">Explore specialists <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#e8ede2] py-20 sm:py-24">
        <div className="container mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#587060]">What matters to us</p><h2 className="mt-4 font-display text-4xl font-medium tracking-[-.06em] text-[#204b3b] sm:text-5xl">Care that feels human.</h2></div><p className="max-w-sm text-sm leading-6 text-[#607466]">The experience should feel steady and respectful from the very first click.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{values.map((value) => <article key={value.title} className="border-t border-[#bdcdbb] px-1 py-6 sm:px-4 sm:py-8"><value.icon className="h-6 w-6 text-[#477357] stroke-[1.5]" /><h3 className="mt-5 text-xl font-medium text-[#204b3b]">{value.title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[#607466]">{value.desc}</p></article>)}</div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-primary">Member stories</p><h2 className="mt-4 font-display text-4xl font-medium tracking-[-.06em] sm:text-5xl">Small steps can feel big.</h2></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4 text-primary" />Member experiences</div></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">{testimonials.map((testimonial) => <article key={testimonial.name} className="flex min-h-[230px] flex-col border-l-2 border-[#a4bba0] bg-card/40 p-6 sm:p-7"><div className="font-serif text-4xl leading-none text-[#719476]">“</div><p className="mt-3 flex-1 font-serif text-xl leading-7 text-foreground/90">{testimonial.quote}</p><div className="mt-6 border-t border-border/70 pt-4"><p className="text-sm font-semibold">{testimonial.name}</p><p className="mt-1 text-xs text-muted-foreground">{testimonial.role}</p></div></article>)}</div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#183e32] px-6 py-12 text-[#f4f3e9] sm:px-10 sm:py-16 lg:px-14">
            <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/15" /><div className="pointer-events-none absolute -right-2 -top-16 h-56 w-56 rounded-full border border-white/15" /><div className="pointer-events-none absolute -right-12 -top-8 h-32 w-32 rounded-full bg-[#7c9d79]/30 blur-2xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#b9cfb5]">Start where you are</p><h2 className="mt-4 font-display text-4xl font-medium leading-tight tracking-[-.06em] sm:text-5xl">A little support can open up a lot of space.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[#d1dfd1]">Explore your options, meet specialists and take the next step when you feel ready.</p></div><Button asChild size="lg" className="h-12 rounded-full bg-[#f4f3e9] px-7 text-[#204b3b] shadow-none hover:bg-white"><Link to="/signup">Take your first step <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
