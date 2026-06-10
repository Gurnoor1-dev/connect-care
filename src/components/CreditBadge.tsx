import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    if (!user || role !== "customer") {
      setRows([]);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("customer_specialist_credits")
        .select("credit_points, specialist:specialist_profiles!customer_specialist_credits_specialist_id_fkey(display_name)")
        .eq("customer_id", user.id)
        .gt("credit_points", 0)
        .order("updated_at", { ascending: false });

      setRows((data as CreditRow[]) ?? []);
    })();
  }, [user, role]);

  const total = rows.reduce((sum, row) => sum + Number(row.credit_points ?? 0), 0);
  const title = useMemo(() => {
    if (rows.length === 0) return "No specialist credits yet";
    return rows
      .map((row) => `${row.specialist?.display_name ?? "Specialist"}: ${row.credit_points} credits`)
      .join("\n");
  }, [rows]);

  if (!user || role !== "customer") return null;

  return (
    <Badge variant="secondary" title={title} className="gap-1.5 rounded-lg bg-card/90 px-2.5 py-1 text-foreground shadow-brand">
      <Coins className="h-3.5 w-3.5 text-teal" />
      {total} Credits
    </Badge>
  );
}
