# ============================================================
# SMARTCABB — Télécharge le dernier backup hors site
# Usage :
#   powershell -ExecutionPolicy Bypass -File scripts\download-latest-backup.ps1
# Planifier ce script une fois par semaine (Planificateur de tâches Windows).
# ============================================================
param(
  [string]$Destination = "$env:USERPROFILE\OneDrive\SmartCabb-Backups",
  [string]$ProjectRef = "zaerjqchzqmcxqblkfkg",
  [string]$CronSecret = "smartcabb-cron-2026"
)

$ErrorActionPreference = "Stop"
$api = "https://$ProjectRef.supabase.co/functions/v1/make-server-2eb02e52"
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

Write-Host "Recherche du dernier backup…"
$latest = Invoke-RestMethod `
  -Uri "$api/backups/latest" `
  -Headers @{ "x-cron-secret" = $CronSecret } `
  -TimeoutSec 120

if (-not $latest.success -or -not $latest.url) {
  throw "Aucun backup disponible : $($latest.error)"
}

$target = Join-Path $Destination $latest.name
if (Test-Path $target) {
  Write-Host "Déjà téléchargé : $target"
  exit 0
}

Write-Host "Téléchargement de $($latest.name)…"
Invoke-WebRequest -Uri $latest.url -OutFile $target -TimeoutSec 600

$sizeMo = [math]::Round((Get-Item $target).Length / 1MB, 2)
Write-Host "✅ Backup enregistré : $target ($sizeMo Mo)"
