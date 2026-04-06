#!/bin/bash

# Script untuk upload kode ke GitHub
# Usage: chmod +x upload.sh && ./upload.sh

echo "🚀 Memulai upload ke GitHub..."
echo ""

# Cek apakah git sudah diinstall
if ! command -v git &> /dev/null; then
    echo "❌ Git tidak terinstall. Silakan install git terlebih dahulu."
    exit 1
fi

# Inisialisasi git jika belum ada
if [ ! -d ".git" ]; then
    echo "📦 Inisialisasi Git repository..."
    git init
fi

# Tambah semua file ke staging
echo "📝 Menambahkan file ke staging..."
git add .

# Commit
echo "💾 Commit perubahan..."
git commit -m "feat: upload project to GitHub"

# Set branch ke main
echo "🌿 Set branch ke main..."
git branch -M main

# Tambah remote jika belum ada
if ! git remote | grep -q "origin"; then
    echo "🔗 Menambahkan remote origin..."
    git remote add origin https://github.com/rise-crystal/jasbug.git
fi

# Push ke GitHub
echo "⬆️  Push ke GitHub..."
git push -u origin main

echo ""
echo "✅ Upload selesai!"
echo "📦 Repository: https://github.com/rise-crystal/jasbug"
