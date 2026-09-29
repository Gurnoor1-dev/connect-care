import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Coins } from "lucide-react";

type CreditRow = {
  credit_points: number;
  specialist?: { display_name: string | null } | null;
};

export function CreditBadge() {
  const { user, role } = useAuth();
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [open, setOpen] = useState(false);

  const loadCredits = async () => {
    if (!user || role !== "customer") { setRows([]); return; }
    const { data } = await supabase
      .from("customer_specialist_credits")
      .select("credit_points, specialist:specialist_profiles!customer_specialist_credits_specialist_id_fkey(display_name)")
      .eq("customer_id", user.id)
      .order("updated_at", { ascending: false });
    setRows((data as CreditRow[]) ?? []);
  };

  useEffect(() => { void loadCredits(); }, [user, role]);

  const total = rows.reduce((sum, row) => sum + Number(row.credit_points ?? 0), 0);
  const visibleRows = useMemo(() => rows.filter((row) => Number(row.credit_points ?? 0) > 0), [rows]);

  if (!user || role !== "customer") return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${total} credits remaining`} className="outline-none">
          <Badge variant="secondary" className="cursor-pointer gap-1.5 rounded-lg bg-teal/10 px-2.5 py-1 text-teal shadow-brand transition-colors hover:bg-teal/20">
            <Coins className="h-3.5 w-3.5" />
            {total} credit{total !== 1 ? "s" : ""}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Your session credits</h3>
            <p className="mt-1 text-xs text-muted-foreground">Each session uses 2 credits.</p>
          </div>
          <div className="rounded-full bg-teal/10 px-2.5 py-1 text-sm font-semibold text-teal">{total}</div>
        </div>
        <div className="mt-4 space-y-2">
          {visibleRows.length === 0 ? (
            <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">No credits available yet.</p>
          ) : visibleRows.map((row, index) => (
            <div key={`${row.specialist?.display_name ?? "specialist"}-${index}`} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2.5">
              <span className="min-w-0 truncate text-sm font-medium">{row.specialist?.display_name ?? "Specialist"}</span>
              <span className="ml-3 shrink-0 text-sm font-semibold text-teal">{row.credit_points} credit{row.credit_points !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
        {total >= 2 && <p className="mt-3 text-xs text-muted-foreground">You have enough credits for {Math.floor(total / 2)} session{Math.floor(total / 2) !== 1 ? "s" : ""}.</p>}
      </PopoverContent>
    </Popover>
  );
}
