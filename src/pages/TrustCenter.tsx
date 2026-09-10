import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  { icon: HeartHandshake, title: "Human support", text: "BreatheRise is designed to make finding a supportive conversation feel simple, respectful and personal." },
  { icon: ShieldCheck, title: "Clear boundaries", text: "We explain what our service is—and what it is not—so you can choose the right kind of support." },
  { icon: LockKeyhole, title: "Privacy-minded", text: "Your account, appointment and session experience are treated as personal information and handled with care." },
  { icon: Stethoscope, title: "Not emergency care", text: "BreatheRise is not a replacement for emergency services, diagnosis or urgent medical treatment." },
];

const checklist = [
  "Choose a specialist and session that fit your needs",
  "See the appointment time and session details before paying",
  "Receive confirmation and reminders for your booked session",
  "Join the private video session during the allowed join window",
  "Access relevant session notes or prescriptions when provided by your specialist",
];

export default function TrustCenter() {
  return (
    <div className="container mx-auto py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-primary/15 bg-gradient-to-br from-accent/70 via-background to-secondary/50 p-7 shadow-card sm:p-10 md:p-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-brand"><ShieldCheck className="h-6 w-6" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">Trust & safety</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">A clearer, calmer way to understand BreatheRise.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Before you book, pay or join a session, you should know who you are dealing with, how the experience works, what information matters, and where our boundaries are.</p>
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
          {[{ title: "Who BreatheRise is for", text: "People looking for thoughtful support, coaching or a structured conversation around everyday wellbeing, personal growth and life challenges." }, { title: "What BreatheRise is not", text: "It is not an emergency service and should not be used for urgent medical needs, crisis intervention or situations requiring immediate clinical care." }].map(item => <div key={item.title} className="rounded-3xl border border-border/70 bg-secondary/35 p-7"><h2 className="text-xl font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p></div>)}
        </section>

        <section className="mt-12 rounded-3xl border border-primary/15 bg-accent/45 p-7 sm:p-9">
          <div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm"><LockKeyhole className="h-5 w-5" /></div><div><h2 className="text-2xl font-semibold">Payments & personal information</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">BreatheRise uses PayU for payment processing. We aim to keep payment and account flows clear and minimize unnecessary exposure of sensitive information. Never share passwords, payment credentials or private session details with anyone claiming to be BreatheRise outside the official service.</p></div></div>
        </section>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Privacy','/privacy'],['Terms','/terms'],['Cancellation & refunds','/cancellation'],['Contact support','/contact']].map(([label,to]) => <Button key={to} asChild variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4"><Link to={to}>{label}<FileText className="h-4 w-4" /></Link></Button>)}
        </div>
        <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">Policies should be reviewed and finalized for the jurisdictions in which BreatheRise operates before launch. This page is product guidance, not legal advice.</p>
      </div>
    </div>
  );
}
