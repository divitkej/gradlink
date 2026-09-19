# Send GradLink auth emails from your own sender (custom SMTP)

By default Supabase sends auth emails from **"Supabase Auth"** using its shared mailer
(which is also why you can hit the *"email rate limit exceeded"* error). Plugging in your
own SMTP provider lets you:

- Set the sender to **GradLink <no-reply@yourdomain>**
- Remove the low shared rate limit
- Improve deliverability (less spam-foldering)

You only need this for production polish — the branded templates already work without it.

---

## Recommended: Resend (free tier, 5-min setup)

### 1. Create an account + get an API key
- Sign up at https://resend.com
- **API Keys → Create API Key** → copy it (starts with `re_...`)

### 2. (For real branding) Verify your domain
- **Domains → Add Domain** → enter the domain you'll send from (e.g. `gradlink.ae`)
- Add the **SPF**, **DKIM**, and **DMARC** DNS records it shows, at your domain registrar
- Wait for it to show **Verified**
- Your sender becomes e.g. `no-reply@gradlink.ae`

> No domain yet? For testing you can send from `onboarding@resend.dev`, but it only
> delivers to your own verified email. Verify a domain before going live.

### 3. Plug it into Supabase
Supabase Dashboard → **Authentication → Emails → SMTP Settings** → enable **Custom SMTP**, then:

| Field | Value |
|---|---|
| Sender email | `no-reply@gradlink.ae` (or your verified address) |
| Sender name | `GradLink` |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) — or `587` (TLS) |
| Username | `resend` |
| Password | your Resend API key (`re_...`) |

Save. Send yourself a test sign-up — it now arrives from **GradLink**.

### 4. (Optional) Raise the rate limits
**Authentication → Rate Limits** → increase "Emails per hour" now that you control the sender.

---

## Other providers (same idea, different host/credentials)

| Provider | Host | Port | Username | Password |
|---|---|---|---|---|
| Resend | smtp.resend.com | 465/587 | `resend` | API key |
| SendGrid | smtp.sendgrid.net | 587 | `apikey` | API key |
| Postmark | smtp.postmarkapp.com | 587 | server token | server token |
| Brevo | smtp-relay.brevo.com | 587 | login email | SMTP key |
| AWS SES | email-smtp.<region>.amazonaws.com | 587 | SMTP username | SMTP password |

All of them: verify your sending domain (SPF/DKIM) first, then enter the SMTP host,
port, username, and password into Supabase's Custom SMTP form with Sender name = `GradLink`.
