// ═══════════════════════════════════════════════════
// EDGE FUNCTION — Créer un paiement Notchpay
// La Secret Key est sécurisée côté serveur
// ═══════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTCHPAY_SECRET = Deno.env.get("NOTCHPAY_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://geri-saas.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { plan, email, user_id, boutique_nom } = await req.json();

    // Valider le plan
    const plans: Record<string, { amount: number; label: string; months: number }> = {
      pro:      { amount: 4900,  label: "Géri Pro — 1 mois",      months: 1  },
      pro3:     { amount: 13000, label: "Géri Pro — 3 mois",      months: 3  },
      business: { amount: 14900, label: "Géri Business — 1 mois", months: 1  },
    };

    const selected = plans[plan];
    if (!selected) return new Response(JSON.stringify({ error: "Plan invalide" }), { status: 400 });

    // Créer la transaction Notchpay
    const payload = {
      amount: selected.amount,
      currency: "XOF",
      email,
      description: selected.label,
      reference: `geri-${user_id}-${plan}-${Date.now()}`,
      callback: `https://geri-saas.vercel.app/app.html?payment=success&plan=${plan}`,
      metadata: { user_id, plan, boutique_nom },
    };

    const res = await fetch("https://api.notchpay.co/payments/initialize", {
      method: "POST",
      headers: {
        "Authorization": NOTCHPAY_SECRET,
        "Content-Type": "application/json",
        "X-Grant": "payment",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.authorization_url) {
      console.error("Notchpay error:", data);
      return new Response(JSON.stringify({ error: data.message || "Erreur Notchpay" }), { status: 500 });
    }

    return new Response(JSON.stringify({ url: data.authorization_url, reference: payload.reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
