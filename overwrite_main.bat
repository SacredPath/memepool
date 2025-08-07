@echo off
echo Force pushing master to main (overwriting main branch)...
git push origin master:main --force
echo.
echo Deleting master branch from remote...
git push origin --delete master
echo.
echo Switching local branch to main...
git checkout -b main
git push origin main
echo.
echo Deleting local master branch...
git branch -d master
echo.
echo Setting up main as default branch...
git branch -M main
echo Done! Main branch is now the default and master is deleted.
pause
