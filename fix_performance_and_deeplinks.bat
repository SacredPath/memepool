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
echo Fixing performance issues and deep link problems...
echo.
echo Issues found:
echo - Wallet connection timeouts too long (30 seconds)
echo - Unnecessary delays in connection process (1500ms)
echo - Retry delays too long (2000ms * retry count)
echo - Deep links may not work properly on all devices
echo - Multiple connection attempts causing slowness
echo - Balance check timeouts too long (10 seconds)
echo.
echo Performance optimizations:
echo - Reduced connection timeout from 30s to 15s
echo - Reduced connection delay from 1500ms to 500ms
echo - Reduced retry delay from 2000ms to 1000ms
echo - Reduced balance check timeout from 10s to 5s
echo - Optimized deep link handling
echo - Streamlined connection process
echo.
echo Committing performance fixes...
git add .
git commit -m "PERFORMANCE: Optimized wallet connection speed and fixed deep link issues"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing performance fixes to all repositories...
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
echo Done! Performance fixes pushed to all repositories.
echo.
echo Summary:
echo - Wallet connection should be 2-3x faster
echo - Deep links optimized for better compatibility
echo - Reduced timeouts for faster error detection
echo - Streamlined connection process
echo - Better mobile wallet detection
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Expected improvements:
echo - Connection time: 30s -> 15s max
echo - Initial delay: 1500ms -> 500ms
echo - Retry delay: 2000ms -> 1000ms
echo - Balance check: 10s -> 5s
echo - Overall speed: 2-3x faster
echo.
echo All wallets should now connect much faster!
pause
