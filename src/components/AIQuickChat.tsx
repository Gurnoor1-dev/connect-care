import { useEffect, useRef, useState } from "react";
import { ChevronRight, Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/square-logo.png";

type Message = { role: "user" | "assistant"; content: string };

const faqs = [
  "How do I book a session?",
  "What is your cancellation policy?",
  "I paid but my booking isn't showing.",
  "My video call isn't working.",
];

const answers: Record<string, string> = {
  "How do I book a session?": "Sign in, open Book a session, choose a specialist and available time, then complete payment. You’ll receive confirmation after the booking is confirmed.",
  "What is your cancellation policy?": "Cancellations or rescheduling 24+ hours before a session are eligible for a full refund or complimentary rescheduling. Please see the Cancellation & Refunds policy for the complete terms.",
  "I paid but my booking isn't showing.": "Please wait a moment and refresh your appointments. If your payment was successful but the appointment is still missing, contact support with your payment/transaction details so the team can investigate.",
  "My video call isn't working.": "Check your browser camera/microphone permissions, use a stable connection, and re-open the session. If the problem continues, contact support and include the appointment time and any error message you see.",
};

export function AIQuickChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I’m the BreatheRise assistant. I can answer quick questions, help with common site issues, or point you to the right place." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text = input) => {
    const value = text.trim();
    if (!value || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: value }]);
    setLoading(true);
    try {
      const faqAnswer = Object.entries(answers).find(([q]) => q.toLowerCase() === value.toLowerCase())?.[1];
      const apiUrl = import.meta.env.VITE_AI_CHAT_URL as string | undefined;
      const response = apiUrl ? await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value, history: messages }) }) : null;
      if (response?.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.reply || "I couldn't generate a response right now. Please contact support." }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: faqAnswer || "I can help with booking, payments, cancellations, video-call troubleshooting, and common website questions. For account-specific or payment issues I may need the support team to take a closer look." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: faqAnswer || "I’m having trouble connecting right now. Please try again or contact BreatheRise support." }]);
    } finally { setLoading(false); }
  };

  return <>
    {open && <div className="fixed bottom-16 right-4 z-[70] flex max-h-[calc(100dvh-5.5rem)] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl sm:right-6 sm:bottom-20 sm:max-h-[calc(100dvh-7rem)]">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-secondary/40 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-background"><img src={logo} alt="" className="h-full w-full object-cover" /></div><div className="min-w-0"><div className="flex items-center gap-1.5 font-semibold"><span>BreatheRise AI</span><Sparkles className="h-3.5 w-3.5 text-primary" /></div><p className="text-xs text-muted-foreground">Quick help & common questions</p></div></div>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => setOpen(false)} aria-label="Close AI chat"><X className="h-4 w-4" /></Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-foreground"}`}>{m.content}</div></div>)}
        {messages.length === 1 && <div className="space-y-2 pt-1"><p className="px-1 text-xs font-medium text-muted-foreground">Popular questions</p>{faqs.map(f => <button key={f} type="button" onClick={() => send(f)} className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-accent"><span>{f}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></button>)}</div>}
        {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 border-t border-border/70 p-3"><form onSubmit={e => { e.preventDefault(); void send(); }} className="flex items-center gap-2"><Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a quick question…" className="h-10 rounded-xl bg-secondary/50" disabled={loading} /><Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!input.trim() || loading} aria-label="Send message"><Send className="h-4 w-4" /></Button></form><p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">AI can make mistakes. Don’t share passwords, payment card details, or sensitive personal information.</p></div>
    </div>}
    <Button type="button" onClick={() => setOpen(v => !v)} aria-label={open ? "Close AI quick chat" : "Open AI quick chat"} className="fixed bottom-5 right-5 z-[71] h-16 w-16 rounded-full border border-border/80 bg-white p-0 text-foreground shadow-xl transition-all hover:scale-105 hover:shadow-2xl dark:bg-zinc-800 dark:text-white sm:bottom-6 sm:right-6 sm:h-[68px] sm:w-[68px]">
      {open ? <X className="h-6 w-6" /> : <img src={logo} alt="Open BreatheRise AI chat" className="h-10 w-10 object-contain dark:invert sm:h-11 sm:w-11" />}
    </Button>
  </>;
}
