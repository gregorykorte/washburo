export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing ?code", { status: 400 });

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/decap-auth/callback`,
    }),
  });
  const data = await tokenRes.json();

  if (!data.access_token) {
    return new Response(JSON.stringify({ error: "oauth_exchange_failed", detail: data }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const payload = { token: data.access_token, provider: "github" };

  const html = `<!doctype html><meta charset="utf-8">
<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  var payload = ${JSON.stringify(payload)};

  try {
    // Store token for parent (same origin), covers both Decap v3 & Netlify CMS v2
    localStorage.setItem('decap-cms-auth', JSON.stringify(payload));
    localStorage.setItem('netlify-cms-user', JSON.stringify(payload));
  } catch (e) {}

  try {
    // Tell the opener we've succeeded. Use both globals, broad target to be safe.
    var to = window.opener || window.parent;
    if (to) {
      try { to.postMessage('authorization:github:success:' + JSON.stringify(payload), origin); } catch (e) {}
      try { to.postMessage('authorization:github:success:' + JSON.stringify(payload), '*'); } catch (e) {}
    }
  } catch (e) {}

  // Close and leave a fallback message if popup doesn't close
  try { window.close(); } catch (e) {}
  document.body.innerHTML = '<p>Authentication complete. You can close this window.</p>';
})();
</script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    },
  });
}
