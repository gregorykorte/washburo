export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const authorize = new URL("https://github.com/login/oauth/authorize");

  // Forward any incoming query params (Decap may pass ?state=…)
  for (const [k, v] of url.searchParams) {
    authorize.searchParams.set(k, v);
  }

  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/api/decap-auth/callback`);
  // Reasonable scopes for committing to the repo and reading email
  if (!authorize.searchParams.has("scope")) {
    authorize.searchParams.set("scope", "repo user:email");
  }

  return Response.redirect(authorize.toString(), 302);
}
