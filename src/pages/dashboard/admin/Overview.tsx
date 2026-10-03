import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CreditCard, DollarSign, Users, ArrowRight } from "lucide-react";

type Payment = {
  id:string; amount_cents:number; currency:string; scheduled_at:string; status:string;
  razorpay_payment_status:string|null; customer_id:string; specialist_id:string;
  customer?: { full_name:string|null; email:string|null };
  specialist?: { display_name:string|null };
};

type Earning = { amount_cents:number; currency:string; earned_at:string; specialist_id:string };

export default function AdminOverview(){
 const [payments,setPayments]=useState<Payment[]>([]);
 const [earnings,setEarnings]=useState<Earning[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{let dead=false;(async()=>{
  const [{data:p},{data:e}]=await Promise.all([
   supabase.from("appointments").select("id,amount_cents,currency,scheduled_at,status,razorpay_payment_status,customer_id,specialist_id,customer:profiles!appointments_customer_id_fkey(full_name,email),specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)").eq("razorpay_payment_status","captured").order("scheduled_at",{ascending:false}).limit(8),
   supabase.from("specialist_session_earnings").select("amount_cents,currency,earned_at,specialist_id").order("earned_at",{ascending:false}).limit(500)
  ]);
  if(!dead){setPayments((p??[]) as Payment[]);setEarnings((e??[]) as Earning[]);setLoading(false)}
 })();return()=>{dead=true}},[]);
 const totalRevenue=payments.reduce((s,p)=>s+p.amount_cents,0);
 const totalEarnings=earnings.reduce((s,e)=>s+e.amount_cents,0);
 const platform=totalRevenue-totalEarnings;
 return <div className="space-y-6">
  <header><h1 className="text-3xl font-bold">Admin console</h1><p className="mt-1 text-muted-foreground">Monitor BreatheRise payments and specialist earnings.</p></header>
  <div className="grid gap-4 sm:grid-cols-3">
   <Stat icon={CreditCard} value={money(totalRevenue,"USD")} label="Captured payments" />
   <Stat icon={DollarSign} value={money(totalEarnings,"USD")} label="Specialist earnings" />
   <Stat icon={DollarSign} value={money(platform,"USD")} label="BreatheRise gross share" />
  </div>
  <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Finance</h2><p className="text-sm text-muted-foreground">Review every payment and attendance-qualified specialist income.</p></div><Button asChild><Link to="/dashboard/admin/payments">Open payments & income <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>
  {loading ? <Card className="p-8 text-center text-muted-foreground">Loading finance data...</Card> : <Card><div className="p-4 font-semibold">Recent captured payments</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-y bg-muted/30 text-xs uppercase text-muted-foreground"><tr><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Specialist</th><th className="p-3 text-left">Session</th><th className="p-3 text-right">Payment</th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-b last:border-0"><td className="p-3"><div className="font-medium">{p.customer?.full_name||"—"}</div><div className="text-xs text-muted-foreground">{p.customer?.email||"—"}</div></td><td className="p-3">{p.specialist?.display_name||"—"}</td><td className="p-3">{new Date(p.scheduled_at).toLocaleString()}</td><td className="p-3 text-right font-medium">{money(p.amount_cents,p.currency)}</td></tr>)}</tbody></table></div></Card>}
 </div>
}
function money(c:number,currency:string){return new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:2}).format(c/100)}
function Stat({icon:Icon,value,label}:{icon:any;value:string;label:string}){return <Card className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground"><Icon className="h-5 w-5"/></div><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></div></Card>}
