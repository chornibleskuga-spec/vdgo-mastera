@echo off
chcp 65001 >nul
echo ==========================================
echo    VDGO Master - Запуск...
echo ==========================================
echo.

IF NOT EXIST node_modules (
  echo Установка зависимостей (первый запуск)...
  npm install
  IF %ERRORLEVEL% NEQ 0 (
    echo ОШИБКА: npm install не удался
    echo Убедитесь что Node.js установлен: https://nodejs.org
    pause
    exit /b 1
  )
)

IF NOT EXIST dist\boot.js (
  echo Сборка проекта...
  npm run build
)

echo.
echo Запуск сервера...
echo Сайт откроется автоматически...
echo.
start http://localhost:3000
npm start

pause
