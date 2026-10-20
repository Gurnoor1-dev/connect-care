import { Link } from "react-router-dom";
import { Brain, Sparkles, Zap, Shield, ArrowUpRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { i: Brain, n: "01", t: "Notice what you need", d: "Begin with the part of life where you’d welcome more clarity, steadiness or support. You don’t need to have everything figured out." },
  { i: Sparkles, n: "02", t: "Explore people, not profiles alone", d: "Read about specialists, their experience and their approach. Take your time choosing someone who feels like a good fit." },
  { i: Zap, n: "03", t: "Choose a time that works for you", d: "Compare available sessions and clear pricing, then book around your own schedule." },
  { i: Shield, n: "04", t: "Keep moving at your pace", d: "Make space for a thoughtful conversation and practical next steps. Progress doesn’t have to happen all at once." },
];

export default function HowItWorks() {
  return (
    <div className="bg-[#f4f3e9]">
      <section className="container mx-auto grid gap-10 py-14 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-20 lg:py-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#53765d]"><Leaf className="h-4 w-4" /> The BreatheRise path</div>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-medium leading-[1.02] tracking-[-.07em] text-[#204b3b] sm:text-6xl">Support, without the extra <span className="font-serif italic font-normal text-[#789577]">noise.</span></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#627467]">A simple path from wondering where to start to finding a conversation that feels useful.</p>
          <Button asChild className="mt-8 rounded-full bg-[#204b3b] px-6 text-white shadow-none hover:bg-[#163a2d]"><Link to="/specialists">Explore specialists <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          <div className="mt-12 hidden max-w-xs border-t border-[#cbd7c7] pt-5 text-sm leading-6 text-[#65796b] lg:block">You can take one step at a time. There’s no need to rush the process.</div>
        </div>
        <ol className="border-t border-[#cbd7c7]">
          {steps.map(({i: Icon,n,t,d}) => <li key={n} className="grid gap-5 border-b border-[#cbd7c7] py-7 sm:grid-cols-[70px_1fr] sm:gap-7 sm:py-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfe8d9] text-[#315b49]"><Icon className="h-5 w-5 stroke-[1.5]" /></div>
            <div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#79917a]">Step {n}</div><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#204b3b] sm:text-3xl">{t}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#627467]">{d}</p></div>
          </li>)}
        </ol>
      </section>
      <section className="bg-[#204b3b] py-12 text-[#f4f3e9] sm:py-16"><div className="container mx-auto flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b9cfb5]">When you’re ready</p><h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">Your next step can start here.</h2></div><Button asChild variant="outline" className="rounded-full border-[#9bb59a] bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/specialists">Meet the specialists <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div></section>
    </div>
  );
}
