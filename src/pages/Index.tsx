import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight, ArrowUpRight, Brain, Check, HeartHandshake,
  Leaf, LockKeyhole, MoonStar, Star, Users, Wind,
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
            {/* Optimized background visual structure */}
            <div className="absolute left-[7%] top-[8%] h-[80%] w-[86%] rounded-[48%_52%_46%_54%/45%_42%_58%_55%] bg-[#dce7d6] dark:bg-[#1b2f25]" />
            <div className="absolute left-[16%] top-[15%] h-[66%] w-[70%] rounded-[50%] border border-[#91ae94]/60 dark:border-[#53765e]/60" />
            <div className="absolute left-[24%] top-[23%] h-[50%] w-[54%] rounded-[50%] border border-[#91ae94]/60 dark:border-[#53765e]/60" />
            
            {/* Outer central blend circle - enhanced clarity */}
            <div className="absolute left-[32%] top-[31%] h-[34%] w-[38%] rounded-[50%] bg-[#b5cbb4]/50 dark:bg-[#365743]" />
            
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
          </div>
        </div>
        <div className="border-t border-[#d7dfd1] dark:border-[#365341]">
          <div className="container mx-auto flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#587060] dark:text-[#b9cfb5]">Whatever season you’re in</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{supportAreas.map((item) => <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[#365746] dark:text-[#d0dfcf]"><span className="text-base text-[#78977c]">{item.icon}</span>{item.label}</span>)}</div>
          </div>
        </div>
      </section>

      {/* Remaining sections can follow here, unchanged */}
    </div>
  );
}
