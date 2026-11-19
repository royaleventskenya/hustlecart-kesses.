"use client";

// AuthScreen — name + phone + role + OTP.
// No demo code. When the SMS gateway isn't configured (development mode), a
// random code is still generated and shown in a clearly-labeled banner so
// the app remains testable; in production the code is only delivered via SMS.
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Phone,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  User,
  AlertCircle,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BagKMark } from "@/components/logo";
import { useAppStore } from "@/store/use-app-store";
import { normalizePhone, formatPhone } from "@/lib/format";

type Step = "phone" | "otp";

export function AuthScreen({ mode = "shopper" }: { mode?: "shopper" | "operator" }) {
  const setSession = useAppStore((s) => s.setSession);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Dev mode = SMS gateway not configured; the random code is surfaced to the
  // user. In production this stays false and the code is only sent via SMS.
  const [devMode, setDevMode] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const phone = normalizePhone(phoneInput);

  async function handleSendCode() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (!phone) {
      toast.error("Enter a valid Kenyan phone number, e.g. +254 712 000001.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not send code.");
        setSubmitting(false);
        return;
      }
      setDevMode(Boolean(data.devMode));
      setDevCode(data.devCode ?? null);
      setStep("otp");
      toast.success("Code sent!", {
        description: data.devMode
          ? "Development mode — code shown below."
          : "Check your phone for an SMS from HustleCart Kesses.",
      });
      setResendIn(30);
    } catch (e) {
      console.error(e);
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!phone || resendIn > 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not resend.");
        setSubmitting(false);
        return;
      }
      setDevMode(Boolean(data.devMode));
      setDevCode(data.devCode ?? null);
      toast.success("Code resent!", {
        description: data.devMode ? "Development mode — code shown below." : "Check your SMS.",
      });
      setResendIn(30);
    } finally {
      setSubmitting(false);
    }
  }

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function handleVerify() {
    if (String(code).length !== 4) {
      toast.error("Enter the 4-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      // Include the referral code if one was stored from the landing page URL.
      const refCode = typeof window !== "undefined" ? localStorage.getItem("hc_ref_code") : null;
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, referredBy: refCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not verify. Try again.");
        setSubmitting(false);
        return;
      }
      // Operator mode validation: if the phone doesn't match the operator
      // phone, the server assigns role=shopper. We reject it here so
      // non-operators can't access the dashboard via the operator login.
      if (mode === "operator" && data.user.role !== "operator") {
        toast.error("This phone is not registered as an operator.", {
          description: "Use the shopper login instead.",
        });
        setSubmitting(false);
        return;
      }
      setSession(data.user);
      toast.success(`Karibu, ${data.user.name}!`, {
        description: data.user.role === "operator"
          ? "Operator dashboard loading…"
          : "Storefront loading…",
      });
    } catch (e) {
      console.error(e);
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-soft-orange via-cream to-white">
      {/* Top brand strip */}
      <header className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setAuthMode(null)}
          className="flex items-center gap-2"
        >
          <BagKMark width={36} height={36} />
          <div className="font-extrabold text-navy tracking-tight text-lg">
            Hustle<span className="text-orange-brand">Cart</span>{" "}
            <span className="text-muted-foreground font-semibold text-sm">Kesses</span>
          </div>
        </button>
        <button
          onClick={() => setAuthMode(null)}
          className="text-xs text-muted-foreground hover:text-navy transition-colors"
        >
          ← Back
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "operator" ? "bg-navy" : "bg-orange-brand/15"}`}>
                {mode === "operator" ? (
                  <Store className="w-6 h-6 text-white" />
                ) : (
                  <BagKMark width={36} height={36} />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy">
                  {mode === "operator" ? "Operator Login" : "Welcome to HustleCart"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "operator"
                    ? "Sign in with your registered operator phone."
                    : "Sign in with your phone — we'll shop for you and deliver."}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <div>
                    <Label htmlFor="name" className="mb-2 block">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Wanjiru Kamau"
                        className="pl-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendCode();
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="mb-2 block">
                      Phone number
                    </Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        inputMode="tel"
                        placeholder="+254 712 000001"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="pl-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendCode();
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      We&rsquo;ll send a 4-digit code via SMS to verify your number.
                    </p>
                  </div>

                  <Button
                    onClick={handleSendCode}
                    disabled={submitting || !phone || name.trim().length < 2}
                    className="w-full h-11"
                    size="lg"
                  >
                    {submitting ? "Sending code…" : "Send code"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  <button
                    onClick={() => setStep("phone")}
                    className="text-xs text-muted-foreground hover:text-navy flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change details
                  </button>

                  <div>
                    <Label className="mb-2 block">Enter the 4-digit code</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      We sent a code to <span className="font-semibold text-navy">{phone ? formatPhone(phone) : phoneInput}</span>.
                    </p>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={4}
                        value={code}
                        onChange={(v) => setCode(v)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {/* Development mode banner — random code surfaced for testing.
                        In production (SMS configured), this never shows. */}
                    {devMode && devCode && (
                      <div className="mt-4 mx-auto max-w-xs bg-amber-brand/15 border border-amber-brand/40 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-brand mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-amber-brand uppercase tracking-wide">
                              Development mode
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              SMS gateway not configured. Use this code to sign in:
                            </div>
                            <div className="text-lg font-mono font-bold text-navy mt-1 tracking-widest text-center">
                              {devCode}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Real mode: resend with cooldown. */}
                    {!devMode && (
                      <div className="mt-4 text-center">
                        <p className="text-xs text-muted-foreground mb-2">
                          Didn&rsquo;t get the SMS? Check your network or try again.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResend}
                          disabled={submitting || resendIn > 0}
                          className="text-orange-brand hover:text-orange-brand/80"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${submitting ? "animate-spin" : ""}`} />
                          {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                        </Button>
                      </div>
                    )}

                    {/* In dev mode, also allow resend (regenerates a new random code). */}
                    {devMode && (
                      <div className="mt-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResend}
                          disabled={submitting || resendIn > 0}
                          className="text-muted-foreground hover:text-navy"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${submitting ? "animate-spin" : ""}`} />
                          {resendIn > 0 ? `Resend in ${resendIn}s` : "Generate new code"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={submitting || code.length !== 4}
                    className="w-full h-11"
                    size="lg"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {submitting ? "Verifying…" : "Verify & continue"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing you agree to our terms of service. Standard SMS rates may apply.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
