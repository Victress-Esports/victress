// Completes a deferred interaction. Discord gives each interaction a token that lasts 15 minutes and can edit the original
// reply through a webhook URL. It is NOT the bot token and needs no other credential. The token is never logged.
const API = "https://discord.com/api/v10";

export async function completeDeferred(
  applicationId: string,
  interactionToken: string,
  message: { content: string; flags?: number; allowed_mentions?: { parse: string[] } },
  doFetch: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await doFetch(`${API}/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interactionToken)}/messages/@original`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch {
    return false;
  }
}
