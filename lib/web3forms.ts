// Web3Forms — no-backend form delivery. Submissions POST to Web3Forms, which
// emails them to the account owner. The access key is PUBLIC by design (it ships
// in the client form markup), so it is safe to commit. Override per-environment
// with NEXT_PUBLIC_WEB3FORMS_KEY if you rotate it.
const ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "6031b4f5-548e-40d9-9cce-2f05fadfbea4";

const ENDPOINT = "https://api.web3forms.com/submit";

export type Web3FormsResult = { ok: true } | { ok: false; error: string };

/**
 * Send a form submission to Web3Forms. `fields` is a flat object of the form
 * values; `subject` labels the email so you can tell which form it came from.
 * Never throws — returns a typed result the caller renders as success/error.
 */
export async function submitToWeb3Forms(
  fields: Record<string, unknown>,
  subject: string,
): Promise<Web3FormsResult> {
  // Honeypot: Web3Forms drops the submission if `botcheck` is truthy.
  if (fields.botcheck) return { ok: true };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: ACCESS_KEY,
        subject,
        from_name: "VSK Sports Website",
        ...fields,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.message || "Could not send. Please try again." };
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }
}
