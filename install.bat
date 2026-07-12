@echo off
chcp 65001 >nul
title ВДГО Мастер — Сборка
echo ========================================
echo     ВДГО МАСТЕР — Сборка программы
echo ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js НЕ найден!
    echo.
    echo Вам нужно установить Node.js:
    echo 1. Откройте https://nodejs.org
    echo 2. Нажмите зеленую кнопку "LTS"
    echo 3. Запустите скачанный файл и нажимайте "Далее"
    echo 4. После установки перезапустите этот файл
    echo.
    start https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi
    pause
    exit /b 1
)

echo [+] Node.js найден
echo.

:: Install dependencies
echo [1/3] Установка зависимостей...
call npm install
if errorlevel 1 (
    echo [X] Ошибка установки!
    pause
    exit /b 1
)

:: Build
echo.
echo [2/3] Сборка программы...
call npm run build
if errorlevel 1 (
    echo [X] Ошибка сборки!
    pause
    exit /b 1
)

:: Done
echo.
echo ========================================
echo     ГОТОВО!
echo ========================================
echo.
echo Программа собрана:
echo     release\VDGO-Master.exe
echo.
echo Можно скопировать на рабочий стол
echo или передать коллеге.
echo.
pause
