# Stops Supabase from sending a confirmation email on every sign-up — which is what
# exhausts the built-in mailer's hourly rate limit. New users are auto-confirmed instead,
# so they can sign in immediately and NO sign-up emails are sent.
#
# This needs ONLY your Supabase access token (no domain, no SMTP). It stays on your machine.
#
# Get a token: Supabase dashboard -> account menu -> Access Tokens -> generate.
#
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File supabase/disable-email-confirmation.ps1 -Token "sbp_xxx"
#
# To also raise the password-reset email allowance a bit on the built-in mailer, this sets
# rate_limit_email_sent too (note: the built-in mailer still has a low ceiling — custom SMTP
# via configure-smtp.ps1 is the only way to truly remove it).

param(
  [Parameter(Mandatory = $true)] [string]$Token,
  [int]$RateLimit = 100,
  [string]$ProjectRef = "dtagbttabqslphxlanel"
)

$body = @{
  mailer_autoconfirm    = $true   # auto-confirm new users -> no confirmation email on sign-up
  rate_limit_email_sent = $RateLimit
} | ConvertTo-Json

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "Disabling sign-up confirmation emails (auto-confirm) on $ProjectRef..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -Body $body | Out-Null
  Write-Host "Done. New sign-ups no longer send a confirmation email, so the rate limit won't be hit by sign-ups." -ForegroundColor Green
  Write-Host "Password-reset emails still send (rarely) via the built-in mailer." -ForegroundColor Green
} catch {
  Write-Error "Failed: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
