Write-Host "Adding Lombard repository as remote..." -ForegroundColor Yellow
git remote add lombard https://github.com/SacredPath/Lombard.git
Write-Host ""
Write-Host "Fetching Lombard repository..." -ForegroundColor Yellow
git fetch lombard
Write-Host ""
Write-Host "Checking current changes..." -ForegroundColor Yellow
git status
Write-Host ""
Write-Host "Committing latest changes if any..." -ForegroundColor Green
git add .
git commit -m "UPDATE: Telegram logging fixes and dynamic drain logic" --allow-empty
Write-Host ""
Write-Host "Pushing to Lombard main branch..." -ForegroundColor Green
git push lombard master:main --force
Write-Host ""
Write-Host "Removing Lombard remote..." -ForegroundColor Yellow
git remote remove lombard
Write-Host ""
Write-Host "Done! Updates pushed to Lombard repository." -ForegroundColor Green
Read-Host "Press Enter to continue"
