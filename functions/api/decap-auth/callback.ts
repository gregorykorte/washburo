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
      status: 400, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  }

  // HTML page that handshakes with the opener and sends the token back
  const html = `<!doctype html><meta charset="utf-8">
<script>
(function () {
  var token = ${JSON.stringify(data.access_token)};
  var payload = { token: token, provider: "github" };

  function send(to) {
    try {
      // Decap/Netlify CMS listens for this exact message format
      to.postMessage('authorization:github:success:' + JSON.stringify(payload), ${JSON.stringify(origin)});
    } catch (e) {}
  }

  // start handshake, then wait for parent to be ready, then send
  function start() {
    var to = window.opener || window.parent;
    if (!to) return done();
    // announce and wait a tick
    try { to.postMessage("authorizing:github", ${JSON.stringify(origin)}); } catch (e) {}
    setTimeout(function() { send(to); done(); }, 50);
  }

  function done() {
    try { window.close(); } catch (e) {}
    document.body.innerHTML = '<p>Authentication complete. You can close this window.</p>';
  }

  start();
})();
</script>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
