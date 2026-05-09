Set-Location -LiteralPath $PSScriptRoot

Write-Host "1/3 Web build" -ForegroundColor Cyan
npm --prefix web run build

Write-Host "2/3 Backend dry-run" -ForegroundColor Cyan
.\.venv\Scripts\python.exe backend\jobs\price_update_job.py

Write-Host "3/3 Supabase smoke test (nur mit .env)" -ForegroundColor Cyan
if (Test-Path -LiteralPath ".env") {
    .\.venv\Scripts\python.exe backend\jobs\test_supabase_connection.py
} else {
    Write-Host "Keine .env gefunden. Supabase-Test uebersprungen." -ForegroundColor Yellow
}
