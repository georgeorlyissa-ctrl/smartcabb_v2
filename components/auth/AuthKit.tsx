/**
 * 🎨 AUTH KIT — Connexion / Inscription (passager & chauffeur)
 * ---------------------------------------------------------------------------
 * Briques d'interface partagées, alignées sur la charte SmartCabb :
 *   • bleu principal  #007AFF
 *   • jaune accent    #FFCC00
 *   • marine profond  #003D7A / #001B3D
 *   • typographie dense (échelle Uber définie dans styles/globals.css)
 *
 * Le logo est utilisé en filigrane (monochrome blanc, très faible opacité)
 * derrière le contenu, comme demandé.
 *
 * Aucune logique métier ici : uniquement de la présentation.
 */

import * as React from 'react';
import { SmartCabbLogo } from '../SmartCabbLogo';
import { BRAND_LOGO_URL } from '../../lib/brand-config';
import { Eye, EyeOff, Loader2 } from '../../lib/icons';

export type AuthAudience = 'passenger' | 'driver' | 'admin';

export const AUTH_COLORS = {
  navy: '#001B3D',
  navySoft: '#00294F',
  brandNavy: '#003D7A',
  blue: '#007AFF',
  blueDark: '#0063D1',
  yellow: '#FFCC00',
  ink: '#0B1B2B',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E4E9F0',
  field: '#F6F8FB',
  success: '#0F9D58',
  danger: '#E11D48',
} as const;

/* -------------------------------------------------------------------------- */
/*  Filigrane logo                                                            */
/* -------------------------------------------------------------------------- */

export function LogoWatermark({
  className = '',
  opacity = 0.07,
}: {
  className?: string;
  opacity?: number;
}) {
  if (!BRAND_LOGO_URL) return null;
  return (
    <img
      src={BRAND_LOGO_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none select-none object-contain ${className}`}
      style={{ filter: 'grayscale(1) brightness(0) invert(1)', opacity }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Coquille (fond + panneau de marque + carte)                               */
/* -------------------------------------------------------------------------- */

export interface AuthHighlight {
  icon: React.ReactNode;
  title: string;
  text: string;
}

export function AuthShell({
  audience,
  headline,
  subline,
  highlights = [],
  children,
}: {
  audience: AuthAudience;
  headline: string;
  subline: string;
  highlights?: AuthHighlight[];
  children: React.ReactNode;
}) {
  const isDriver = audience === 'driver';
  const isAdmin = audience === 'admin';
  const accent = isDriver ? AUTH_COLORS.yellow : isAdmin ? '#7CC4FF' : AUTH_COLORS.blue;
  const glowStrong = isDriver ? 0.30 : isAdmin ? 0.14 : 0.18;

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden pb-safe-page"
      style={{
        background: `linear-gradient(168deg, #000E1F 0%, ${AUTH_COLORS.navy} 34%, #00305E 66%, #004A8F 100%)`,
      }}
    >
      {/* Halos de lumière */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-52 h-[620px] w-[620px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0,122,255,0.42) 0%, rgba(0,122,255,0.10) 45%, rgba(0,122,255,0) 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-56 -left-44 h-[560px] w-[560px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(255,204,0,${glowStrong}) 0%, rgba(255,204,0,0) 70%)`,
        }}
      />

      {/* Trame discrète */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Filigrane logo */}
      <LogoWatermark
        className="absolute -bottom-28 -right-24 h-[560px] w-[560px] rotate-[-14deg]"
        opacity={isDriver ? 0.09 : 0.07}
      />
      <LogoWatermark
        className="absolute -left-32 top-1/3 h-[380px] w-[380px] rotate-[8deg] hidden lg:block"
        opacity={0.04}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1140px] flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
        {/* Panneau de marque — desktop */}
        <aside className="hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:self-stretch lg:py-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]">
                <SmartCabbLogo plain className="h-9 w-9" />
              </div>
              <div>
                <p className="text-[17px] font-black tracking-tight text-white">SmartCabb</p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Ride Smart · Live Smart
                </p>
              </div>
            </div>

            <h2 className="mt-12 max-w-[420px] text-[34px] font-black leading-[1.12] tracking-tight text-white">
              {headline}
            </h2>
            <p className="mt-4 max-w-[400px] text-[13.5px] leading-relaxed text-white/55">{subline}</p>

            {highlights.length > 0 && (
              <ul className="mt-10 space-y-4">
                {highlights.map((item) => (
                  <li key={item.title} className="flex items-start gap-3.5">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/12"
                      style={{
                        background: isDriver
                          ? 'rgba(255,204,0,0.16)'
                          : isAdmin
                            ? 'rgba(124,196,255,0.16)'
                            : 'rgba(0,122,255,0.22)',
                        color: isDriver ? AUTH_COLORS.yellow : isAdmin ? '#7CC4FF' : '#7CC4FF',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold text-white">{item.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-white/45">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-10 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            Kinshasa · RDC · 24/7
          </div>
        </aside>

        {/* Colonne formulaire */}
        <main className="w-full lg:w-[460px] lg:shrink-0">{children}</main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Carte                                                                     */
/* -------------------------------------------------------------------------- */

export function AuthCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] bg-white shadow-[0_40px_90px_-30px_rgba(0,10,25,0.75)] ring-1 ring-white/20 ${className}`}
    >
      {/* Liseré de marque */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${AUTH_COLORS.blue} 0%, ${AUTH_COLORS.blue} 55%, ${AUTH_COLORS.yellow} 100%)` }}
      />
      <div className="relative px-5 pb-6 pt-6 sm:px-7 sm:pb-7">{children}</div>
    </div>
  );
}

/** En-tête de marque compact (mobile & tablette). */
export function AuthCardBrand({ audience }: { audience: AuthAudience }) {
  const isDriver = audience === 'driver';
  const isAdmin = audience === 'admin';
  const label = isDriver ? 'Chauffeur' : isAdmin ? 'Admin' : 'Passager';
  return (
    <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-[#E4E9F0] shadow-[0_8px_18px_-12px_rgba(0,0,0,0.45)]">
          <SmartCabbLogo plain className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[14px] font-black leading-none tracking-tight text-[#0B1B2B]">SmartCabb</p>
          <p className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#94A3B8]">
            Ride Smart · Live Smart
          </p>
        </div>
      </div>
      <span
        className="rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]"
        style={{
          background: isDriver
            ? 'rgba(255,204,0,0.18)'
            : isAdmin
              ? 'rgba(0,61,122,0.08)'
              : 'rgba(0,122,255,0.10)',
          color: isDriver ? '#7A5B00' : '#0063D1',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function AuthEyebrow({
  audience,
  children,
}: {
  audience: AuthAudience;
  children: React.ReactNode;
}) {
  const isDriver = audience === 'driver';
  const isAdmin = audience === 'admin';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.16em]"
      style={{
        background: isDriver
          ? 'rgba(255,204,0,0.16)'
          : isAdmin
            ? 'rgba(0,61,122,0.08)'
            : 'rgba(0,122,255,0.09)',
        color: isDriver ? '#7A5B00' : isAdmin ? '#003D7A' : '#0063D1',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: isDriver ? AUTH_COLORS.yellow : isAdmin ? '#003D7A' : AUTH_COLORS.blue }}
      />
      {children}
    </span>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mt-3">
      <h1 className="text-[25px] font-black leading-[1.15] tracking-tight text-[#0B1B2B]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#64748B]">{subtitle}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Champs                                                                    */
/* -------------------------------------------------------------------------- */

export const authInputClass =
  'h-12 w-full rounded-2xl border border-[#E4E9F0] bg-[#F6F8FB] px-3.5 text-[15px] font-medium text-[#0B1B2B] outline-none transition-all duration-200 placeholder:font-normal placeholder:text-[#A3AEBD] focus:border-[#007AFF] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,122,255,0.13)] disabled:cursor-not-allowed disabled:opacity-60';

export function AuthField({
  label,
  htmlFor,
  hint,
  action,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex min-h-[16px] items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[10.5px] font-bold uppercase leading-none tracking-[0.12em] text-[#64748B]"
        >
          {label}
        </label>
        {action && <div className="shrink-0 leading-none">{action}</div>}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: React.ReactNode;
    trailing?: React.ReactNode;
  }
>(({ icon, trailing, className = '', ...props }, ref) => (
  <div className="relative">
    {icon && (
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
        {icon}
      </span>
    )}
    <input
      ref={ref}
      {...props}
      className={`${authInputClass} ${icon ? 'pl-[42px]' : ''} ${trailing ? 'pr-12' : ''} ${className}`}
    />
    {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
  </div>
));
AuthInput.displayName = 'AuthInput';

/** Champ mot de passe avec bouton œil. */
export function AuthPasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  disabled,
  autoComplete = 'new-password',
  onKeyDown,
  icon,
  onKeyPress,
  name,
}: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  name?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <AuthInput
      id={id}
      name={name}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onKeyDown={onKeyDown}
      onKeyPress={onKeyPress}
      icon={icon}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={{ minHeight: 0, width: 36, height: 36 }}
          className="flex items-center justify-center rounded-xl text-[#94A3B8] transition-colors hover:bg-[#EEF2F7] hover:text-[#0B1B2B]"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Boutons & liens                                                           */
/* -------------------------------------------------------------------------- */

export function AuthButton({
  children,
  loading,
  variant = 'primary',
  trailingIcon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'driver' | 'admin';
  trailingIcon?: React.ReactNode;
}) {
  const styles =
    variant === 'driver'
      ? 'bg-[#FFCC00] text-[#001B3D] shadow-[0_14px_30px_-14px_rgba(255,204,0,0.9)] hover:bg-[#FFD633]'
      : variant === 'admin'
        ? 'bg-[#003D7A] text-white shadow-[0_14px_30px_-14px_rgba(0,61,122,0.9)] hover:bg-[#00294F]'
        : 'bg-[#007AFF] text-white shadow-[0_14px_30px_-14px_rgba(0,122,255,0.95)] hover:bg-[#0069DB]';

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`group relative flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold tracking-tight transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Un instant…</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {trailingIcon && (
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">{trailingIcon}</span>
          )}
        </>
      )}
    </button>
  );
}

export function AuthTextLink({
  children,
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ minHeight: 0 }}
      className={`inline p-0 align-baseline font-semibold text-[#0063D1] transition-colors hover:text-[#004A9E] hover:underline disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function AuthFootnote({
  text,
  actionLabel,
  onAction,
  disabled,
}: {
  text: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <p className="text-center text-[12.5px] text-[#64748B]">
      {text}{' '}
      <AuthTextLink onClick={onAction} disabled={disabled}>
        {actionLabel}
      </AuthTextLink>
    </p>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#E4E9F0]" />
      <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#A3AEBD]">{label}</span>
      <span className="h-px flex-1 bg-[#E4E9F0]" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Alertes                                                                   */
/* -------------------------------------------------------------------------- */

export function AuthAlert({
  tone = 'error',
  title,
  children,
  action,
}: {
  tone?: 'error' | 'success' | 'info';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const palette = {
    error: { bg: '#FFF1F4', border: '#FECDD6', text: '#9F1239', dot: '#E11D48' },
    success: { bg: '#ECFDF3', border: '#BBF7D0', text: '#166534', dot: '#0F9D58' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', dot: '#007AFF' },
  }[tone];

  return (
    <div
      className="rounded-2xl border p-3.5"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: palette.dot }}
        >
          {tone === 'success' ? '✓' : tone === 'error' ? '!' : 'i'}
        </span>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-[12.5px] font-bold" style={{ color: palette.text }}>
              {title}
            </p>
          )}
          <p className="text-[12px] leading-relaxed" style={{ color: palette.text }}>
            {children}
          </p>
        </div>
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Indicateur de robustesse du mot de passe                                  */
/* -------------------------------------------------------------------------- */

export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'];
  const colors = ['#E4E9F0', '#E11D48', '#F59E0B', '#0EA5E9', '#0F9D58'];

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: score >= bar ? colors[score] : '#E4E9F0' }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10.5px] text-[#94A3B8]">6 caractères minimum</span>
        {score > 0 && (
          <span className="text-[10.5px] font-bold" style={{ color: colors[score] }}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Divers                                                                    */
/* -------------------------------------------------------------------------- */

export function AuthSectionTitle({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[11px] font-black text-[#003D7A]">
        {index}
      </span>
      <div>
        <p className="text-[13.5px] font-bold text-[#0B1B2B]">{title}</p>
        {subtitle && <p className="mt-0.5 text-[11.5px] leading-snug text-[#94A3B8]">{subtitle}</p>}
      </div>
    </div>
  );
}

export function AuthBackButton({ onClick, label = 'Retour' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 0 }}
      className="inline-flex items-center gap-1.5 p-0 text-[12px] font-semibold text-[#64748B] transition-colors hover:text-[#0B1B2B]"
    >
      <span className="text-[14px] leading-none">←</span>
      {label}
    </button>
  );
}

/** Case à cocher carrée, alignée sur le reste du kit. */
export function AuthCheckbox({
  id,
  checked,
  onChange,
  className = '',
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{ width: 18, height: 18, minWidth: 18, minHeight: 18 }}
      className={`mt-0.5 flex shrink-0 items-center justify-center rounded-[6px] border p-0 transition-all duration-200 ${
        checked
          ? 'border-[#007AFF] bg-[#007AFF] shadow-[0_4px_10px_-4px_rgba(0,122,255,0.85)]'
          : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8]'
      } ${className}`}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}
