// ============================================================================
// CASCARÓN SUPABASE EDGE FUNCTION — PUNTO 5 (TAREA DEL INTEGRANTE 2)
// Ruta: supabase/functions/academic-advisor/index.ts
// Descripción: Edge Function lista para que el Integrante 2 implemente lógica
// serverless adicional (ej. Asesor Académico IA / LinceHub Analytics) sin
// conflictos de merge con el Integrante 1.
// ============================================================================

// Declaración mínima de tipos para evitar errores si no se ejecuta en runtime Deno local
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // TODO (Integrante 2):
    // 1. Extraer datos académicos enviados desde el frontend o backend (/api/extra)
    // 2. Conectar con Supabase / Modelo de recomendación para calcular sugerencias
    //    de carga académica, prioridades de tutoría o proyección de créditos.
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const responsePayload = {
      ok: true,
      module: "academic-advisor-edge-function",
      status: "placeholder_ready",
      message:
        "Cascarón de Supabase Edge Function activo. Listo para la implementación del Integrante 2 (Punto 5).",
      receivedInput: Boolean(body && Object.keys(body).length > 0),
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (_error) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Error interno al procesar la solicitud en la Edge Function.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

