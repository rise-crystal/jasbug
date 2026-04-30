@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

REM Script untuk push ke GitHub lalu deploy ke Vercel production (Windows)
REM Usage: upload.bat

set "REPO_URL=https://github.com/rise-crystal/jasbug.git"
set "COMMIT_MESSAGE=chore: sync project to GitHub and Vercel"

echo.
echo [INFO] Memulai sinkronisasi GitHub + Vercel...
echo.

REM Cek apakah git sudah diinstall
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git tidak terinstall. Silakan install git terlebih dahulu.
    pause
    exit /b 1
)

REM Cek apakah vercel CLI sudah diinstall
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI tidak ditemukan. Install dengan: npm i -g vercel
    pause
    exit /b 1
)

REM Inisialisasi git jika belum ada
if not exist ".git" (
    echo [INFO] Inisialisasi Git repository...
    git init
    if errorlevel 1 goto :error
)

REM Tambah semua file ke staging
echo [INFO] Menambahkan file ke staging...
git add -A
if errorlevel 1 goto :error

REM Commit hanya jika ada perubahan
git diff --cached --quiet
if !errorlevel! equ 0 (
    echo [INFO] Tidak ada perubahan baru untuk di-commit.
) else (
    if !errorlevel! neq 1 goto :error
    echo [INFO] Commit perubahan...
    git commit -m "%COMMIT_MESSAGE%"
    if errorlevel 1 goto :error
)

REM Set branch ke main
echo [INFO] Set branch ke main...
git branch -M main
if errorlevel 1 goto :error

REM Tambah remote jika belum ada
git remote | findstr "origin" >nul
if errorlevel 1 (
    echo [INFO] Menambahkan remote origin...
    git remote add origin %REPO_URL%
    if errorlevel 1 goto :error
)

REM Push ke GitHub
echo [INFO] Push ke GitHub...
git push -u origin main
if errorlevel 1 goto :error

REM Link ke Vercel jika belum linked
if not exist ".vercel\project.json" (
    echo [INFO] Project belum terhubung ke Vercel. Menjalankan vercel link...
    vercel link
    if errorlevel 1 goto :error
)

REM Deploy ke Vercel production
echo [INFO] Deploy ke Vercel production...
vercel deploy --prod
if errorlevel 1 goto :error

echo.
echo [OK] Sinkronisasi selesai!
echo [INFO] GitHub: %REPO_URL%
echo [INFO] Vercel production berhasil dipicu.
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause
exit /b 0

:error
echo.
echo [ERROR] Proses gagal. Cek pesan error di atas.
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause
exit /b 1
