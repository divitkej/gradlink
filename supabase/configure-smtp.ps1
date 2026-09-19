# Configures custom SMTP on Supabase + raises the email rate limit, in one command.
# Your secrets stay on YOUR machine — they're passed as parameters, never stored.
#
# WHY: Supabase's built-in mailer is hard-capped (~2-4 emails/hr) and CANNOT be raised.
# Pointing Supabase at your own SMTP (e.g. Resend) is the only way to lift the limit.
#
# ONE-TIME SETUP (you do this):
#   1. Create a free Resend account: https://resend.com  ->  API Keys -> create  (re_...)
#   2. Verify your sending domain in Resend (add the SPF/DKIM DNS records it gives you).
#      Your sender becomes e.g. no-reply@yourdomain.
#   3. Create a Supabase access token: Supabase dashboard -> account menu -> Access Tokens.
#
# RUN (from the project root):
#   powershell -ExecutionPolicy Bypass -File supabase/configure-smtp.ps1 `
#     -Token "sbp_xxx" -SmtpPass "re_xxx" -SenderEmail "no-reply@yourdomain"
#
# Defaults assume Resend; override -SmtpHost/-SmtpUser/-SmtpPort for another provider.

param(
  [Parameter(Mandatory = $true)] [string]$Token,        # Supabase personal access token (sbp_...)
  [Parameter(Mandatory = $true)] [string]$SmtpPass,     # SMTP password / provider API key (Resend: re_...)
  [Parameter(Mandatory = $true)] [string]$SenderEmail,  # verified sender, e.g. no-reply@yourdomain
  [string]$SenderName = "GradLink",
  [string]$SmtpHost   = "smtp.resend.com",
  [string]$SmtpUser   = "resend",
  [int]$SmtpPort      = 465,
  [int]$RateLimit     = 500,     # emails per hour (custom SMTP can handle high volume; override as needed)
  [string]$ProjectRef = "dtagbttabqslphxlanel"
)

$body = @{
  smtp_admin_email      = $SenderEmail
  smtp_host             = $SmtpHost
  smtp_port             = "$SmtpPort"
  smtp_user             = $SmtpUser
  smtp_pass             = $SmtpPass
  smtp_sender_name      = $SenderName
  smtp_max_frequency    = 1        # min seconds between emails to one address
  rate_limit_email_sent = $RateLimit
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "Enabling custom SMTP ($SmtpHost) and raising email rate limit to $RateLimit/hr..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -Body $body | Out-Null
  Write-Host "Done. Emails now send via $SenderEmail with a $RateLimit/hr limit." -ForegroundColor Green
  Write-Host "Send yourself a password reset to confirm." -ForegroundColor Green
} catch {
  Write-Error "Failed: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
