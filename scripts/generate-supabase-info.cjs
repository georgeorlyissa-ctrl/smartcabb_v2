#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
console.log('DEBUT GENERATION');
const rawProjectId = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID || '';
const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const projectId = rawProjectId.replace(/[\r\n\t]/g, '').trim();
const publicAnonKey = rawAnonKey.replace(/[\r\n\t]/g, '').trim();
console.log('DEBUG - Longueur projectId brute:', rawProjectId.length, 'nettoyee:', projectId.length);
console.log('DEBUG - Longueur anonKey brute:', rawAnonKey.length, 'nettoyee:', publicAnonKey.length);
if (!projectId || !publicAnonKey) {
  console.error('ERREUR: Variables manquantes');
  process.exit(1);
}
const dir = path.join(__dirname, '..', 'utils', 'supabase');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const content = 'export const projectId = "' + projectId + '"\nexport const publicAnonKey = "' + publicAnonKey + '"\n';
const filePath = path.join(dir, 'info.tsx');
fs.writeFileSync(filePath, content, 'utf-8');
console.log('FICHIER GENERE - ProjectId:', projectId);
