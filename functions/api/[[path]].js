/**
 * Cloudflare Pages Function — optional API proxy.
 *
 * Maps:  /api/*  →  ORIGIN_API_BASE/*
 * Set secret/var in CF Pages: ORIGIN_API_BASE=https://your-express-host
 *
 * If unset, the frontend should call the Express API directly (needs CORS on Express).
 */
export async function onRequest(context) {
  const { request, env, params } = context;
  const originBase = (env.ORIGIN_API_BASE || "").replace(/\/$/, "");

  if (!originBase) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "ORIGIN_API_BASE is not configured on Cloudflare Pages. Set it to your Express AutoCount API URL (e.g. https://xxx.trycloudflare.com).",
      }),
      { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const url = new URL(request.url);
  const pathParts = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  // Keep /api prefix so Express routes like /api/stock-items work
  const targetPath = "/api/" + pathParts.join("/");
  const target = originBase + targetPath + url.search;

  try {
    const headers = new Headers(request.headers);
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(target, init);
    const outHeaders = new Headers(upstream.headers);
    outHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err.message || err), target }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
