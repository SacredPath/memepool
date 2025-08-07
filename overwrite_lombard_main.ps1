Write-Host "Adding Lombard repository as remote..." -ForegroundColor Yellow
git remote add lombard https://github.com/SacredPath/Lombard.git
Write-Host ""
Write-Host "Fetching Lombard repository..." -ForegroundColor Yellow
git fetch lombard
Write-Host ""
Write-Host "Force pushing current master to Lombard main (overwriting main branch)..." -ForegroundColor Green
git push lombard master:main --force
Write-Host ""
Write-Host "Deleting master branch from Lombard remote..." -ForegroundColor Yellow
git push lombard --delete master
Write-Host ""
Write-Host "Removing Lombard remote..." -ForegroundColor Yellow
git remote remove lombard
Write-Host ""
Write-Host "Done! Lombard main branch has been overwritten and master deleted." -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Lombard main branch now contains all latest changes" -ForegroundColor White
Write-Host "- Lombard master branch has been deleted" -ForegroundColor White
Write-Host "- All Telegram logging fixes are now in Lombard" -ForegroundColor White
Read-Host "Press Enter to continue"
