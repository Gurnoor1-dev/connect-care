import { Link } from "react-router-dom";
import { ArrowUpRight, HeartHandshake, Leaf, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const principles = [
  { icon: HeartHandshake, title: "Lead with humanity", text: "Support should feel personal, respectful and grounded in the person behind the story." },
  { icon: ShieldCheck, title: "Make the path clearer", text: "Clear information helps people understand their options and choose their next step with confidence." },
  { icon: Leaf, title: "Leave room to grow", text: "There isn’t one right pace or one story of progress. The experience should leave room for both." },
];

export default function About() {
  return (
    <div className="bg-[#f4f3e9]">
      <section className="container mx-auto py-14 sm:py-20 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-20">
          <div><div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#53765d]"><Leaf className="h-4 w-4" /> A note about us</div><h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[1.02] tracking-[-.07em] text-[#204b3b] sm:text-7xl">Breathe deeply.<br/><span className="font-serif italic font-normal text-[#789577]">Rise higher.</span></h1></div>
          <div className="border-l border-[#bdcdbb] pl-6 sm:pl-8"><p className="text-lg leading-8 text-[#405d4b]">BreatheRise is built around a simple belief: finding support should feel more human, not more complicated.</p><p className="mt-5 text-sm leading-7 text-[#65796b]">We bring people and specialists together in a calm, considered space to explore wellbeing, recovery, personal growth and the everyday challenges that can feel heavy when faced alone.</p><Button asChild className="mt-7 rounded-full bg-[#204b3b] px-6 text-white shadow-none hover:bg-[#163a2d]"><Link to="/specialists">Explore our specialists <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
        <div className="mt-16 grid gap-0 border-y border-[#cbd7c7] md:grid-cols-3">{principles.map(({icon:Icon,title,text},i)=><article key={title} className="border-b border-[#cbd7c7] px-1 py-7 md:border-b-0 md:px-6 md:py-9 md:[&:not(:last-child)]:border-r"><span className="font-serif text-sm italic text-[#819780]">0{i+1}</span><Icon className="mt-5 h-6 w-6 text-[#53765d] stroke-[1.5]"/><h2 className="mt-5 text-xl font-medium text-[#204b3b]">{title}</h2><p className="mt-3 text-sm leading-6 text-[#65796b]">{text}</p></article>)}</div>
      </section>
      <section className="bg-[#e5ebdf] py-12 sm:py-16"><div className="container mx-auto flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl font-serif text-2xl italic leading-snug text-[#315b49] sm:text-3xl">“A little more space to understand yourself can change how the next step feels.”</p><Link to="/how-it-works" className="inline-flex shrink-0 items-center text-sm font-semibold text-[#315b49]">How it works <ArrowUpRight className="ml-2 h-4 w-4"/></Link></div></section>
    </div>
  );
}
