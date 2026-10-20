import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";

export default function Contact() {
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("access_key", import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "YOUR_ACCESS_KEY");
    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
      const data = await response.json();
      if (data.success) {
        toast.success("Thanks — we'll get back to you within 24 hours.");
        form.reset();
      } else {
        toast.error(data.message || "Something went wrong.");
      }
    } catch {
      toast.error("Failed to send message. Please check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#f4f3e9]">
      <section className="container mx-auto grid gap-10 py-14 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:py-24">
        <div className="lg:sticky lg:top-32 lg:self-start"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#53765d]">We’re listening</p><h1 className="mt-5 font-display text-5xl font-medium leading-[1.02] tracking-[-.07em] text-[#204b3b] sm:text-6xl">Let’s start a <span className="font-serif italic font-normal text-[#789577]">conversation.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-[#65796b]">Questions, feedback or ideas to share? Send us a note and we’ll get back to you.</p><div className="mt-10 space-y-4 border-t border-[#cbd7c7] pt-6"><div className="flex items-center gap-3 text-sm text-[#405d4b]"><Mail className="h-4 w-4 text-[#53765d]"/>Use the form to reach our team</div><Link to="/trust" className="flex items-center gap-3 text-sm text-[#405d4b] hover:text-[#204b3b]"><MessageCircle className="h-4 w-4 text-[#53765d]"/>Read our trust & safety guide <ArrowUpRight className="h-3.5 w-3.5"/></Link></div></div>
        <div className="rounded-[1.75rem] border border-[#d4ddcf] bg-[#fbfaf4] p-5 sm:p-8 lg:p-10"><div className="mb-8 border-b border-[#d4ddcf] pb-5"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#78917a]">Contact form</p><h2 className="mt-2 text-2xl font-medium text-[#204b3b]">What’s on your mind?</h2></div>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="name" className="text-[#405d4b]">Name</Label><Input id="name" name="name" required className="mt-2 h-12 rounded-xl border-[#cbd7c7] bg-white/70 focus-visible:ring-[#53765d]"/></div><div><Label htmlFor="email" className="text-[#405d4b]">Email</Label><Input id="email" name="email" type="email" required className="mt-2 h-12 rounded-xl border-[#cbd7c7] bg-white/70 focus-visible:ring-[#53765d]"/></div></div>
            <div><Label htmlFor="message" className="text-[#405d4b]">Message</Label><Textarea id="message" name="message" rows={6} required className="mt-2 resize-y rounded-xl border-[#cbd7c7] bg-white/70 focus-visible:ring-[#53765d]" placeholder="Tell us a little about how we can help…"/></div>
            <Button type="submit" disabled={sending} className="h-12 rounded-full bg-[#204b3b] px-7 text-white shadow-none hover:bg-[#163a2d]">{sending ? "Sending…" : "Send your message"} <ArrowUpRight className="ml-2 h-4 w-4"/></Button>
          </form>
        </div>
      </section>
    </div>
  );
}
