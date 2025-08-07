@echo off
echo Committing latest changes...
git add .
git commit -m "FIX: Telegram logging function calls updated to use new API"
echo Pushing to origin main...
git push origin main
echo Done!
pause
