// ============================================================================
// SUPABASE EDGE FUNCTION — ASESOR ACADÉMICO
// Ruta: supabase/functions/academic-advisor/index.ts
// ============================================================================

// Declaración mínima de tipos para evitar errores si no se ejecuta en runtime Deno local
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asFiniteNumber(value: unknown): number {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido. Usa POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "El cuerpo de la solicitud debe ser JSON válido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const input = asRecord(body);
  const kardex = Array.isArray(input.kardex) ? input.kardex : [];
  const calificaciones = Array.isArray(input.calificaciones)
    ? input.calificaciones
    : [];
  const materiasEnRiesgo: Array<{
    materia: unknown;
    clave: unknown;
    unidadesReprobadas: number;
    nivelRiesgo: "Crítico" | "Preventivo";
    recomendacion: string;
  }> = [];
  let creditosAprobados = 0;

  for (const entry of kardex) {
    const materia = asRecord(entry);
    const calificacion = materia.calificacion;
    if (calificacion === "AC" || Number(calificacion) >= 70) {
      creditosAprobados += asFiniteNumber(materia.creditos);
    }
  }

  for (const entry of calificaciones) {
    const item = asRecord(entry);
    const materia = asRecord(item.materia);
    const notas = Array.isArray(item.calificaiones)
      ? item.calificaiones
      : Array.isArray(item.calificaciones)
        ? item.calificaciones
        : [];
    let reprobadas = 0;

    for (const entryNota of notas) {
      const nota = asRecord(entryNota);
      const calificacion = nota.calificacion;
      if (
        calificacion !== null &&
        calificacion !== undefined &&
        calificacion !== "" &&
        Number(calificacion) < 70
      ) {
        reprobadas++;
      }
    }

    if (reprobadas > 0) {
      materiasEnRiesgo.push({
        materia: materia.nombre_materia ?? null,
        clave: materia.clave_materia ?? null,
        unidadesReprobadas: reprobadas,
        nivelRiesgo: reprobadas > 2 ? "Crítico" : "Preventivo",
        recomendacion: "Se sugiere inscripción inmediata a LinceHub Asesorías.",
      });
    }
  }

  const diagnostico = {
    timestamp: new Date().toISOString(),
    estadoGeneral: materiasEnRiesgo.length > 0 ? "Alerta Académica" : "Óptimo",
    materiasEnRiesgo,
    creditosAprobados,
    mensaje:
      materiasEnRiesgo.length > 0
        ? `Tienes ${materiasEnRiesgo.length} materia(s) en riesgo de segunda oportunidad.`
        : "¡Excelente desempeño! No tienes unidades reprobadas actualmente.",
  };

  return new Response(JSON.stringify(diagnostico), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
