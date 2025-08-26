export async function onRequest({ request, env }: { request: Request; env: Record<string, string> }) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  const CLIENT_ID = env.GITHUB_CLIENT_ID;
  const REDIRECT_URI = `${origin}/api/decap-auth/callback`;

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", CLIENT_ID);
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("scope", "repo");

  return Response.redirect(authorize.toString(), 302);
}
