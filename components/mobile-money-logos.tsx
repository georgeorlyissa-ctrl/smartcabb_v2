// Logos SVG des opérateurs Mobile Money RDC

export const VodacomMpesaLogo = () => (
  <div className="flex items-center justify-center w-full h-full bg-red-600 rounded-lg p-2">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <text x="50" y="55" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
        M-PESA
      </text>
    </svg>
  </div>
);

export const OrangeMoneyLogo = () => (
  <div className="flex items-center justify-center w-full h-full bg-orange-500 rounded-lg p-2">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="35" r="20" fill="white" opacity="0.3" />
      <text x="50" y="75" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
        Orange
      </text>
      <text x="50" y="92" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
        Money
      </text>
    </svg>
  </div>
);

export const AirtelMoneyLogo = () => (
  <div className="flex items-center justify-center w-full h-full bg-red-600 rounded-lg p-2">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <path d="M30,60 Q50,30 70,60" fill="none" stroke="white" strokeWidth="4" />
      <text x="50" y="85" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
        airtel money
      </text>
    </svg>
  </div>
);

export const AfrimoneyLogo = () => (
  <div className="flex items-center justify-center w-full h-full bg-blue-600 rounded-lg p-2">
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <polygon points="50,20 70,45 50,70 30,45" fill="white" opacity="0.9" />
      <text x="50" y="90" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
        AFRIMONEY
      </text>
    </svg>
  </div>
);
