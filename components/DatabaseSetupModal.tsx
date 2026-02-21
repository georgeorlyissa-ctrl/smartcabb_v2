import { useState } from 'react';
import { X, ExternalLink, CheckCircle2, Copy } from '../lib/icons';

interface DatabaseSetupModalProps {
  onClose: () => void;
}

export function DatabaseSetupModal({ onClose }: DatabaseSetupModalProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText('https://supabase.com/dashboard').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Silently fail
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fef2f2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
              Base de Données Non Initialisée
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X style={{ width: '24px', height: '24px', color: '#dc2626' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '1rem', color: '#4b5563', marginBottom: '1.5rem' }}>
            Suivez ces <strong>4 étapes rapides</strong> (3 minutes) :
          </p>

          {/* Étape 1 */}
          <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '12px', border: '2px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>1️⃣</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                Ouvrir Supabase
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                <ExternalLink style={{ width: '16px', height: '16px' }} />
                Ouvrir Dashboard
              </a>
              <button
                onClick={copyUrl}
                style={{
                  padding: '0.75rem',
                  backgroundColor: copied ? '#10b981' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Copier le lien"
              >
                {copied ? (
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                ) : (
                  <Copy style={{ width: '16px', height: '16px' }} />
                )}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.5rem', marginBottom: 0 }}>
              Connectez-vous et sélectionnez votre projet SmartCabb
            </p>
          </div>

          {/* Étape 2 */}
          <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '12px', border: '2px solid #a855f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>2️⃣</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b21a8', margin: 0 }}>
                SQL Editor
              </h3>
            </div>
            <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#6b21a8' }}>
              <li>Menu gauche → <strong>SQL Editor</strong></li>
              <li>Cliquez <strong>+ New query</strong></li>
            </ol>
          </div>

          {/* Étape 3 */}
          <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: '#fef9c3', borderRadius: '12px', border: '2px solid #eab308' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>3️⃣</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#713f12', margin: 0 }}>
                Exécuter le SQL
              </h3>
            </div>
            <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#713f12' }}>
              <li>Ouvrez le fichier <code style={{ backgroundColor: '#fef3c7', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>SETUP-TOUT-EN-UN.sql</code></li>
              <li>Copiez <strong>TOUT</strong> (Ctrl+A, Ctrl+C)</li>
              <li>Collez dans Supabase (Ctrl+V)</li>
              <li>Cliquez <strong>RUN</strong> ▶️</li>
              <li>Attendez 20 secondes</li>
            </ol>
          </div>

          {/* Étape 4 */}
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px solid #22c55e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>4️⃣</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#14532d', margin: 0 }}>
                Se Connecter
              </h3>
            </div>
            <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', marginTop: 0 }}>📧 Email</p>
              <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem', marginTop: 0 }}>
                admin@smartcabb.cd
              </p>
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.25rem', marginTop: 0 }}>🔑 Mot de passe</p>
              <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Admin123!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem', marginTop: 0 }}>
              ⏱️ <strong>Temps total : 3 minutes</strong>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
              📚 Guide détaillé : <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>LISEZ-MOI.md</code>
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}