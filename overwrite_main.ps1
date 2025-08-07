Write-Host "Force pushing master to main (overwriting main branch)..." -ForegroundColor Yellow
git push origin master:main --force
Write-Host ""
Write-Host "Deleting master branch from remote..." -ForegroundColor Yellow
git push origin --delete master
Write-Host ""
Write-Host "Switching local branch to main..." -ForegroundColor Green
git checkout -b main
git push origin main
Write-Host ""
Write-Host "Deleting local master branch..." -ForegroundColor Yellow
git branch -d master
Write-Host ""
Write-Host "Setting up main as default branch..." -ForegroundColor Green
git branch -M main
Write-Host "Done! Main branch is now the default and master is deleted." -ForegroundColor Green
Read-Host "Press Enter to continue"
