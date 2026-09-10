import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  { icon: HeartHandshake, title: "Human support", text: "BreatheRise is designed for thoughtful, respectful support around wellbeing, sleep, performance and everyday life challenges." },
  { icon: ShieldCheck, title: "Clear boundaries", text: "We explain what BreatheRise provides, what it does not provide, and when you should use emergency or clinical services instead." },
  { icon: LockKeyhole, title: "Privacy-minded", text: "Personal, booking and session information is handled for the purposes needed to operate your BreatheRise experience." },
  { icon: Video, title: "Secure video sessions", text: "Remote consultations use Daily.co video infrastructure with configured end-to-end encrypted communication and controlled session access." },
];

const checklist = [
  "Choose a specialist and session that fit your needs",
  "See the appointment time, price and session details before paying",
  "Receive booking confirmations and reminders",
  "Join the private video session during the allowed join window",
  "Access relevant session information provided by your specialist",
];

export default function TrustCenter() {
  return (
    <div className="container mx-auto py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-primary/15 bg-gradient-to-br from-accent/70 via-background to-secondary/50 p-7 shadow-card sm:p-10 md:p-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-brand"><ShieldCheck className="h-6 w-6" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">Trust & safety</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">A clearer, calmer way to understand BreatheRise.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Before you book, pay or join a session, you should know how the experience works, how your information is handled, what our service boundaries are and where to get urgent help.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground shadow-brand"><Link to="/how-it-works">See how it works<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/contact">Contact support<MessageCircle className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-border/70 bg-card p-6 shadow-card"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="h-5 w-5" /></div><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}
        </div>

        <section className="mt-12 rounded-3xl border border-border/70 bg-card p-7 shadow-card sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">How your journey works</p>
          <h2 className="mt-3 text-3xl font-semibold">No surprises between choosing support and starting your session.</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{checklist.map(item => <div key={item} className="flex gap-3 rounded-2xl bg-secondary/45 p-4 text-sm leading-6"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{item}</div>)}</div>
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-secondary/35 p-7"><h2 className="text-xl font-semibold">Who BreatheRise is for</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Adults aged 18 and over looking for non-emergency behavioral wellness, sleep architecture optimization and performance coaching.</p></div>
          <div className="rounded-3xl border border-border/70 bg-secondary/35 p-7"><h2 className="text-xl font-semibold">What BreatheRise is not</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">BreatheRise is not an emergency crisis response platform, inpatient psychiatric facility or substitute for urgent medical treatment, diagnosis or prescription medication management.</p></div>
        </section>

        <section className="mt-12 rounded-3xl border border-primary/15 bg-accent/45 p-7 sm:p-9">
          <div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm"><LockKeyhole className="h-5 w-5" /></div><div><h2 className="text-2xl font-semibold">Privacy, payments & secure sessions</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">BreatheRise uses PayU and secure cross-border payment processors. Remote consultations use Daily.co video infrastructure with configured end-to-end encrypted communication. Never share passwords, payment credentials or private session details with anyone claiming to represent BreatheRise outside the official service.</p></div></div>
        </section>

        <section className="mt-12 rounded-3xl border border-destructive/20 bg-destructive/5 p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-destructive">Emergency & crisis support</p>
          <h2 className="mt-3 text-2xl font-semibold">BreatheRise is not an emergency service.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">If you are experiencing thoughts of self-harm, suicidal ideation, an acute psychiatric emergency, or believe you or someone else is in immediate danger, leave the BreatheRise service and contact local emergency or crisis services immediately.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-background/80 p-4 text-sm"><strong>India / EU</strong><br />Emergency: 112</div><div className="rounded-2xl bg-background/80 p-4 text-sm"><strong>United States</strong><br />Suicide & Crisis Lifeline: 988</div><div className="rounded-2xl bg-background/80 p-4 text-sm"><strong>Canada</strong><br />Suicide Crisis Helpline: call or text 988; immediate danger: 911</div><div className="rounded-2xl bg-background/80 p-4 text-sm"><strong>United Kingdom</strong><br />Emergency: 999 · Urgent NHS advice: 111</div><div className="rounded-2xl bg-background/80 p-4 text-sm sm:col-span-2"><strong>Australia</strong><br />Emergency: 000</div></div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">Emergency numbers can vary by location. If your country is not listed, contact your local emergency number or go to the nearest emergency department.</p>
        </section>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Privacy','/privacy'],['Terms','/terms'],['Cancellation & refunds','/cancellation'],['Contact support','/contact']].map(([label,to]) => <Button key={to} asChild variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4"><Link to={to}>{label}<FileText className="h-4 w-4" /></Link></Button>)}
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">BreatheRise is an MSME Registered Enterprise. Registered office: Kheri Shisgran, Pehowa, District Kurukshetra, Haryana – 136128, India. Operational hub: Gurugram, Haryana, India.</p>
      </div>
    </div>
  );
}
