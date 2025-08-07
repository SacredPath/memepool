Write-Host "Changing to correct directory..." -ForegroundColor Yellow
Set-Location "C:\Users\popsl\Downloads\Emi-lokan-main"
Write-Host ""
Write-Host "Current directory:" -ForegroundColor Yellow
Get-Location
Write-Host ""
Write-Host "Checking if this is a git repository..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Not in a git repository!" -ForegroundColor Red
    Write-Host "Please run this script from the Emi-lokan-main directory." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "Git repository found!" -ForegroundColor Green
Write-Host ""
Write-Host "Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""
Write-Host "Adding Lombard repository as remote..." -ForegroundColor Yellow
git remote add lombard https://github.com/SacredPath/Lombard.git
Write-Host ""
Write-Host "Fetching Lombard repository..." -ForegroundColor Yellow
git fetch lombard
Write-Host ""
Write-Host "Force pushing current branch to Lombard main (overwriting main branch)..." -ForegroundColor Green
git push lombard "$currentBranch`:main" --force
Write-Host ""
Write-Host "Deleting master branch from Lombard remote (if it exists)..." -ForegroundColor Yellow
git push lombard --delete master 2>$null; if ($LASTEXITCODE -ne 0) { Write-Host "Master branch does not exist on Lombard" -ForegroundColor Yellow }
Write-Host ""
Write-Host "Removing Lombard remote..." -ForegroundColor Yellow
git remote remove lombard
Write-Host ""
Write-Host "Done! Lombard main branch has been overwritten." -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Lombard main branch now contains all latest changes" -ForegroundColor White
Write-Host "- All Telegram logging fixes are now in Lombard" -ForegroundColor White
Read-Host "Press Enter to continue"
