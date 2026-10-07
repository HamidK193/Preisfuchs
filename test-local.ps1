Set-Location -LiteralPath $PSScriptRoot

Write-Host "1/5 Web unit tests" -ForegroundColor Cyan
npm.cmd --prefix web test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/5 Web build" -ForegroundColor Cyan
npm.cmd --prefix web run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/5 Backend unit tests" -ForegroundColor Cyan
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python -m unittest discover -s backend/jobs -p 'test_*.py' -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "4/5 Backend dry-run" -ForegroundColor Cyan
$env:PRICEFUCHS_DRY_RUN = "1"
uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/price_update_job.py
$backendExitCode = $LASTEXITCODE
Remove-Item Env:PRICEFUCHS_DRY_RUN
if ($backendExitCode -ne 0) { exit $backendExitCode }

Write-Host "5/5 Supabase smoke test (nur mit .env)" -ForegroundColor Cyan
$hasSupabaseEnv = $false
if (Test-Path -LiteralPath ".env") {
    $envContent = Get-Content -LiteralPath ".env" -Raw
    $hasSupabaseEnv = $envContent -match "SUPABASE_URL=https://.+\.supabase\.co" -and $envContent -match "SUPABASE_SERVICE_ROLE_KEY=.+"
}

if ($hasSupabaseEnv) {
    uv --cache-dir .uv-cache run --python 3.12 --with-requirements backend/jobs/requirements.txt python backend/jobs/test_supabase_connection.py
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "Keine vollstaendige .env gefunden. Supabase-Test uebersprungen." -ForegroundColor Yellow
}
