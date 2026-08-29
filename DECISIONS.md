# Decision changes during BUILD

## Password policy / email confirmation (temporary)

| | |
|---|---|
| **Password** | Min **8**, max 128, no character-class rules |
| **Email confirmation** | **Disabled** in `supabase/config.toml` (`enable_confirmations = false`) |
| **Reason** | Dev UX request — simplify local register/login |
| **Before production** | Re-enable email confirmation; consider raising password min length |

## Rate limiting / security headers

| | |
|---|---|
| **Original** | Not implemented |
| **Change** | In-memory rate limits on register/login/forgot/resend; CSP + baseline headers in `next.config.ts` |
| **Reason** | Approved PROMPT 13 gaps |
| **Impact** | Single-instance only; multi-instance needs shared store later |

## Budgets pause/resume

| | |
|---|---|
| **PROMPT 14 wording** | Mentions pause/resume |
| **Precedence** | PROMPT 11 (no pause; monthly UI states only) |
| **Implementation** | Create / edit / delete only |
