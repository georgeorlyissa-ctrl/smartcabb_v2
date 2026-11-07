// Logos des opérateurs Mobile Money RDC
// Fichiers réels servis depuis `public/logos/` (voir aussi components/shared/OperatorLogo.tsx).

interface LogoProps {
  className?: string;
}

const baseClass = 'flex items-center justify-center w-full h-full bg-white rounded-lg p-1';

export const VodacomMpesaLogo = ({ className = '' }: LogoProps) => (
  <div className={`${baseClass} ${className}`}>
    <img src="/logos/mpesa.png" alt="M-Pesa Vodacom" className="max-w-full max-h-full object-contain" />
  </div>
);

export const OrangeMoneyLogo = ({ className = '' }: LogoProps) => (
  <div className={`${baseClass} ${className}`}>
    <img src="/logos/orange-money.png" alt="Orange Money" className="max-w-full max-h-full object-contain" />
  </div>
);

export const AirtelMoneyLogo = ({ className = '' }: LogoProps) => (
  <div className={`${baseClass} ${className}`}>
    <img src="/logos/airtel-money.jpg" alt="Airtel Money" className="max-w-full max-h-full object-contain" />
  </div>
);

export const AfrimoneyLogo = ({ className = '' }: LogoProps) => (
  <div className={`${baseClass} ${className}`}>
    <img src="/logos/logo-afrimoney.png" alt="Afrimoney Africell" className="max-w-full max-h-full object-contain" />
  </div>
);
