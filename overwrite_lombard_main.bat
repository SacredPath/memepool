@echo off
echo Adding Lombard repository as remote...
git remote add lombard https://github.com/SacredPath/Lombard.git
echo.
echo Fetching Lombard repository...
git fetch lombard
echo.
echo Force pushing current master to Lombard main (overwriting main branch)...
git push lombard master:main --force
echo.
echo Deleting master branch from Lombard remote...
git push lombard --delete master
echo.
echo Removing Lombard remote...
git remote remove lombard
echo.
echo Done! Lombard main branch has been overwritten and master deleted.
echo.
echo Summary:
echo - Lombard main branch now contains all latest changes
echo - Lombard master branch has been deleted
echo - All Telegram logging fixes are now in Lombard
pause
