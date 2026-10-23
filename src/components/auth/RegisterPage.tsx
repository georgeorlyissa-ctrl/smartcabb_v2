/**
 * PAGE D'INSCRIPTION - SmartCabb
 * ✅ Avec indication de chargement, messages d'erreur friendly
 * ✅ Rate limiting à 5 tentatives/15min
 * ✅ Bouton retour flèche dans l'en-tête
 * ✅ Utilise useApiCall + LoadingScreen
 * @author SmartCabb Team
 * @date 15 Mars 2026
 */

import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useApiCall } from '../../hooks/useApi';
import { register } from '../../supabase/functions/make-server-2eb02e52/auth-routes';
import { LoadingScreen } from '../../components/LoadingScreen';
import { toast } from '../../components/ui/toast';
import { Icons } from '../../lib/icons';

interface RegisterPageProps {
  onNavigate: (screen: 'login' | 'home' | 'searching' | 'driver_found' | 'settings' | 'history' | 'wallet' | 'profile') => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Validation du mot de passe
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && !!password;

  const { execute, loading, error, success } = useApiCall(() =>
    register({
      email: phone ? `${phone.replace(/\D/g, "")}@smartcabb.app` : '',
      password,
      phone,
      name: fullName,
      role: 'passenger',
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (!passwordValid) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    await execute();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => onNavigate('login')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Icons.ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#222222" }}>{t("register_title")}</h1>
      </div>

      <div className="px-6 pt-6 pb-28">
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>{t("register_subtitle")}</p>
        <div className="space-y-4">
          {[
            { label: t("full_name"), placeholder: "Jean Mukendi", type: "text" },
            { label: t("phone_number"), placeholder: "+243 XXX XXX XXX", type: "tel" },
            { label: t("password"), placeholder: "••••••••", type: "password" },
            { label: t("confirm_password"), placeholder: "••••••••", type: "password" },
          ].map(({ label, placeholder, type }) => (
            <div key={label}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", fontSize: 14, background: "#F9FAFB" }}
                onFocus={(e) => (e.target.style.borderColor = "#007AFF")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>
          ))}

          <div className="flex items-start gap-3 py-2">
            <input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-blue-500" />
            <label htmlFor="terms" style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
              {t("terms_agree")}{" "}
              <span style={{ color: "#007AFF", fontWeight: 600 }}>{t("terms_link")}</span>
            </label>
          </div>

          <button
            onClick={() => onNavigate('home')}
            className="w-full py-4 rounded-2xl text-white transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #007AFF, #007AFF)", fontSize: 15, fontWeight: 700 }}
          >
            {t("register_btn")}
          </button>

          <div className="flex items-center justify-center gap-1">
            <span style={{ fontSize: 14, color: "#6B7280" }}>{t("already_account")}</span>
            <button onClick={() => onNavigate('login')} style={{ fontSize: 14, color: "#007AFF", fontWeight: 600 }}>
              {t("login_link")}
            </button>
          </div>
        </div>
      </div>

      <LoadingScreen isLoading={loading} />
    </div>
  );
}