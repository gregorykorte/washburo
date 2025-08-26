export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing ?code", { status: 400 });

  // Preserve state if GitHub echoed it back (Decap may expect it)
  const state = url.searchParams.get("state") || "";

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

  const payload = { token: data.access_token, provider: "github", state };

  // Minimal HTML that waits for the CMS handshake and replies with the token.
  const html = `<!doctype html><meta charset="utf-8">
<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  var payload = ${JSON.stringify(payload)};

  function cleanup() {
    try { window.close(); } catch (e) {}
    document.body.innerHTML = '<p>Authentication complete. You can close this window.</p>';
  }

  // Fallback: place token where CMS looks on same origin, in case postMessage is missed.
  try {
    localStorage.setItem('decap-cms-auth', JSON.stringify(payload));
    localStorage.setItem('netlify-cms-user', JSON.stringify(payload));
  } catch (e) {}

  function receive(e) {
    try {
      if (typeof e.data === 'string' && e.data.indexOf('authorizing:github') === 0) {
        e.source.postMessage('authorization:github:success:' + JSON.stringify(payload), e.origin);
        window.removeEventListener('message', receive, false);
        cleanup();
      }
    } catch (err) {}
  }
  window.addEventListener('message', receive, false);

  // Kick off the handshake so the opener knows we're ready
  try { (window.opener || window.parent).postMessage('authorizing:github', origin); } catch (e) {}
  try { (window.opener || window.parent).postMessage('authorizing:github', '*'); } catch (e) {}

  // Safety: close after a moment even if no response (CMS will read localStorage on reload)
  setTimeout(cleanup, 1500);
})();
</script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    },
  });
}
