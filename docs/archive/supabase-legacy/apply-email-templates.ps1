# Applies all GradLink-branded auth email templates + subjects + Site URL to Supabase.
# Your access token stays on YOUR machine — it is read from a parameter or env var, never stored.
#
# 1) Create a token: Supabase Dashboard -> account menu -> Access Tokens -> Generate new token
# 2) Run from the project root:
#       powershell -ExecutionPolicy Bypass -File supabase/apply-email-templates.ps1 -Token "sbp_xxx..."
#    (or set $env:SUPABASE_ACCESS_TOKEN first, then run without -Token)
# 3) Revoke the token afterwards if you like.

param(
  [string]$Token = $env:SUPABASE_ACCESS_TOKEN,
  [string]$ProjectRef = "dtagbttabqslphxlanel",
  [string]$SiteUrl = "https://gradlink-theta.vercel.app"
)

if (-not $Token) {
  Write-Error "No token. Pass -Token 'sbp_...' or set `$env:SUPABASE_ACCESS_TOKEN first."
  exit 1
}

$dir = Join-Path $PSScriptRoot "email-templates"
function Read-Tpl([string]$name) { Get-Content -Raw -Path (Join-Path $dir $name) }

$body = @{
  site_url                                = $SiteUrl
  uri_allow_list                          = "$SiteUrl,$SiteUrl/**,http://localhost:3000,http://localhost:3000/**"

  mailer_subjects_confirmation            = "Confirm your email for GradLink"
  mailer_templates_confirmation_content   = (Read-Tpl "confirm-signup.html")

  mailer_subjects_magic_link              = "Your GradLink sign-in link"
  mailer_templates_magic_link_content     = (Read-Tpl "magic-link.html")

  mailer_subjects_recovery                = "Reset your GradLink password"
  mailer_templates_recovery_content       = (Read-Tpl "reset-password.html")

  mailer_subjects_invite                  = "You're invited to GradLink"
  mailer_templates_invite_content         = (Read-Tpl "invite.html")

  mailer_subjects_email_change            = "Confirm your new GradLink email"
  mailer_templates_email_change_content   = (Read-Tpl "change-email.html")

  mailer_subjects_reauthentication        = "Your GradLink verification code"
  mailer_templates_reauthentication_content = (Read-Tpl "reauthentication.html")
} | ConvertTo-Json -Depth 5

$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }
$uri = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "Applying GradLink email templates to project $ProjectRef ..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -Body $body | Out-Null
  Write-Host "Done. All 6 templates, subjects, and Site URL updated." -ForegroundColor Green
  Write-Host "Send yourself a test signup to see the new email." -ForegroundColor Green
} catch {
  Write-Error "Failed: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
