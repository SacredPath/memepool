Write-Host "Committing latest changes..." -ForegroundColor Green
git add .
git commit -m "FIX: Telegram logging function calls updated to use new API"
Write-Host "Pushing to origin main..." -ForegroundColor Green
git push origin main
Write-Host "Done!" -ForegroundColor Green
Read-Host "Press Enter to continue"
