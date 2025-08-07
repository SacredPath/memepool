Write-Host "Checking current branch and remotes..." -ForegroundColor Yellow
git branch -a
Write-Host ""
Write-Host "Current branch:" -ForegroundColor Yellow
git branch --show-current
Write-Host ""
Write-Host "Committing latest changes..." -ForegroundColor Green
git add .
git commit -m "FIX: Telegram logging function calls updated to use new API"
Write-Host ""
Write-Host "Checking which branches exist on remote..." -ForegroundColor Yellow
git ls-remote --heads origin
Write-Host ""
Write-Host "Pushing to origin master (current branch)..." -ForegroundColor Green
git push origin master
Write-Host ""
Write-Host "Also pushing to origin main if it exists..." -ForegroundColor Green
git push origin master:main
Write-Host "Done!" -ForegroundColor Green
Read-Host "Press Enter to continue"
