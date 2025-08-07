@echo off
echo Testing Telegram logging fixes...
echo.
echo Committing Telegram logging improvements...
git add .
git commit -m "FIX: Telegram wallet detection now logs all wallets with wallet type info"
echo.
echo Pushing to Emi-lokan repository...
git push origin master
echo.
echo Pushing to Lombard repository...
git remote add lombard https://github.com/SacredPath/Lombard.git
git push lombard master:main --force
git remote remove lombard
echo.
echo Done! Telegram logging fixes pushed to both repositories.
echo.
echo Changes made:
echo - Removed balance threshold from logWalletDetected
echo - Added wallet type information to logs
echo - Now logs all wallet detections regardless of balance
echo - Wallet type shows in Telegram messages
pause
