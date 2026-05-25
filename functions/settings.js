export async function onRequestGet({ request, env }) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return new Response(null, { status: 204 });
  }

  const settingsValues = env.MY_API_KEYS || env.GEMINI_API_KEYS;
  if (!settingsValues) {
    return Response.json(
      { error: "Cloudflare Pages 环境变量 MY_API_KEYS 未设置" },
      { status: 500 }
    );
  }

  return Response.json({ settings_values: settingsValues });
}
