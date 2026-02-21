# 🔧 Script de correction automatique des imports lucide-react vers /lib/icons (Windows PowerShell)
# Utilisation : .\fix-lucide-imports.ps1

Write-Host "🚀 Début de la correction des imports lucide-react..." -ForegroundColor Green

# 1. Corriger les fichiers dans /components/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 2. Corriger les fichiers dans /components/ui/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/ui/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\ui\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 3. Corriger les fichiers dans /components/admin/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/admin/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\admin\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 4. Corriger les fichiers dans /components/driver/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/driver/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\driver\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 5. Corriger les fichiers dans /components/passenger/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/passenger/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\passenger\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 6. Corriger les fichiers dans /components/shared/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/shared/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\shared\*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

# 7. Corriger les fichiers dans /components/test/*.tsx
Write-Host ""
Write-Host "📁 Correction de /components/test/*.tsx..." -ForegroundColor Cyan
Get-ChildItem -Path "components\test\*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from 'lucide-react'", "from '../../lib/icons'"
    $content = $content -replace 'from "lucide-react"', 'from "../../lib/icons"'
    $content = $content -replace "from 'motion/react'", "from '../../lib/motion'"
    $content = $content -replace 'from "motion/react"', 'from "../../lib/motion"'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "✅ $($_.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Correction terminée !" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Résumé :" -ForegroundColor Yellow
Write-Host "  - Tous les imports 'lucide-react' ont été remplacés" -ForegroundColor White
Write-Host "  - Tous les imports 'motion/react' ont été corrigés" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Prochaine étape : Commit et push vers GitHub" -ForegroundColor Yellow
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'fix: replace lucide-react imports with local /lib/icons'" -ForegroundColor White
Write-Host "  git push origin main" -ForegroundColor White
