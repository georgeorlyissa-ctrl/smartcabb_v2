# Script de correction automatique des extensions backend
Write-Host "🔧 Correction des extensions backend..." -ForegroundColor Cyan

# Chemin du dossier server
$serverPath = ".\supabase\functions\server"

# ÉTAPE 1: Renommer tous les fichiers .tsx en .ts (SAUF kv_store.tsx qui est protégé)
Write-Host "`n📁 ÉTAPE 1: Renommage des fichiers .tsx → .ts" -ForegroundColor Yellow
Get-ChildItem -Path $serverPath -Filter *.tsx | Where-Object { $_.Name -ne "kv_store.tsx" } | ForEach-Object {
    $newName = $_.Name -replace '\.tsx$', '.ts'
    Write-Host "  ✅ $($_.Name) → $newName"
    Rename-Item -Path $_.FullName -NewName $newName -Force
}

# ÉTAPE 2: Remplacer tous les imports .tsx par .ts dans tous les fichiers .ts
Write-Host "`n🔄 ÉTAPE 2: Correction des imports dans tous les fichiers .ts" -ForegroundColor Yellow
Get-ChildItem -Path $serverPath -Filter *.ts | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath -Raw
    
    # Compter les occurrences de .tsx
    $matchCount = ([regex]::Matches($content, '\.tsx')).Count
    
    if ($matchCount -gt 0) {
        Write-Host "  🔧 $($_.Name) - $matchCount imports à corriger"
        
        # Remplacer .tsx par .ts (mais PAS dans kv_store.tsx)
        $newContent = $content -replace '\.tsx(?!["''])', '.ts'
        $newContent = $newContent -replace 'kv_store\.ts', 'kv_store.tsx'
        
        Set-Content -Path $filePath -Value $newContent -NoNewline
        Write-Host "     ✅ Corrigé"
    }
}

Write-Host "`n✅ Correction terminée!" -ForegroundColor Green
Write-Host "📋 Vérification des fichiers:" -ForegroundColor Cyan
Get-ChildItem -Path $serverPath | Select-Object Name, Extension | Format-Table -AutoSize
