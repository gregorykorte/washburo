// functions/api/decap-auth/[...path].ts
// Minimal GitHub OAuth handler for Decap on Cloudflare Pages
// Endpoints:
//   /api/decap-auth/auth      -> redirects to GitHub authorize
//   /api/decap-auth/callback  -> exchanges code for access_token and returns {token}

export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
  const url = new URL(request.url);
  const path = url.pathname.split("/").pop(); // "auth" or "callback"
  const origin = `${url.protocol}//${url.host}`;

  const CLIENT_ID = env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = `${origin}/api/decap-auth/callback`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response("Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET", { status: 500 });
  }

  // Basic CORS (Decap loads from same origin in production)
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  if (path === "auth") {
    // Redirect to GitHub OAuth consent
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", CLIENT_ID);
    authorize.searchParams.set("redirect_uri", REDIRECT_URI);
    // Scope "repo" lets Decap commit to your repo. You can narrow later if you like.
    authorize.searchParams.set("scope", "repo");
    // TODO: add a real state param and verify it in callback for CSRF protection
    return Response.redirect(authorize.toString(), 302);
  }

  if (path === "callback") {
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing ?code", { status: 400 });

    // Exchange code -> token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const data = await tokenRes.json();

    if (!data.access_token) {
      return new Response(JSON.stringify({ error: "oauth_exchange_failed", detail: data }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // Decap expects { token: "<github access token>" }
    return new Response(JSON.stringify({ token: data.access_token }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  return new Response("Not found", { status: 404 });
}
