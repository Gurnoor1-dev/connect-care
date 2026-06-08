import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contact() {
  const [sending, setSending] = useState(false);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Thanks — we'll get back to you within 24 hours.");
      (e.target as HTMLFormElement).reset();
    }, 800);
  };
  return (
    <section className="container mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-4xl font-bold md:text-5xl">Get in touch</h1>
      <p className="mt-4 text-muted-foreground">
        Questions, partnerships, press — we'd love to hear from you.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" required className="mt-2" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required className="mt-2" />
          </div>
        </div>
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" rows={6} required className="mt-2" />
        </div>
        <Button type="submit" disabled={sending} className="bg-gradient-brand text-primary-foreground">
          {sending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </section>
  );
}
