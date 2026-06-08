import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell } from "./Login";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email verified");
    navigate("/dashboard");
  };

  const onResend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error(error.message);
    else toast.success("New code sent");
  };

  return (
    <AuthShell title="Verify your email" subtitle={email ? `We sent a 6-digit code to ${email}` : "Enter the code we sent you"}>
      <div className="space-y-6">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
        <Button onClick={onVerify} disabled={loading || code.length !== 6} className="w-full bg-gradient-brand text-primary-foreground">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
        </Button>
        <button onClick={onResend} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
          Didn't get a code? Resend
        </button>
      </div>
    </AuthShell>
  );
}
