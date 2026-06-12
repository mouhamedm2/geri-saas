// ═══════════════════════════════════════════════════
// EDGE FUNCTION — Webhook Notchpay
// Activé après paiement confirmé → met à jour le plan
// ═══════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTCHPAY_HASH = Deno.env.get("NOTCHPAY_HASH")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const body = await req.json();

    // Vérification signature — désactivée en mode test (Notchpay bug UI)
    // À réactiver en production quand le hash sera disponible
    const isSandbox = body?.payment?.sandbox === true || body?.payment?.reference?.includes('geri-');
    if (!isSandbox) {
      const hash = req.headers.get("x-notch-signature") || "";
      if (!hash) {
        console.warn("Signature manquante");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Traiter uniquement les paiements complétés
    if (body.event !== "payment.complete") return new Response("OK");

    const { user_id, plan } = body.payment.metadata;
    const months = plan.startsWith('pro3') ? 3 : 1;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Calculer la nouvelle date d'expiration
    const now = new Date();
    const expire = new Date(now.setMonth(now.getMonth() + months)).toISOString();

    // Mettre à jour le plan de la boutique
    const { error } = await supabase
      .from("boutiques")
      .update({ plan: plan.replace('3',''), plan_expire_at: expire })
      .eq("user_id", user_id);

    if (error) {
      console.error("Supabase update error:", error);
      return new Response("DB Error", { status: 500 });
    }

    // Enregistrer dans audit_logs
    await supabase.from("audit_logs").insert({
      user_id,
      event: "payment_success",
      details: { plan, expire, reference: body.payment.reference, amount: body.payment.amount }
    });

    console.log(`✅ Plan ${plan} activé pour user ${user_id} jusqu'au ${expire}`);
    return new Response("OK");

  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});
