interface SmartCabbLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function SmartCabbLogo({ className, size = 'medium' }: SmartCabbLogoProps) {
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-20 h-20',
    large: 'w-32 h-32'
  };
  
  const finalClassName = className || sizeClasses[size];
  
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={finalClassName}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle - Navy Blue */}
      <circle cx="50" cy="50" r="48" fill="#003D7A" />
      
      {/* Accent Ring - Cyan */}
      <circle 
        cx="50" 
        cy="50" 
        r="44" 
        fill="none" 
        stroke="#0098FF" 
        strokeWidth="2"
      />
      
      {/* Car Body - Yellow */}
      <path
        d="M 30 55 L 32 45 Q 35 40 40 40 L 60 40 Q 65 40 68 45 L 70 55 Q 72 58 70 60 L 68 62 Q 65 63 62 62 L 60 60 L 40 60 L 38 62 Q 35 63 32 62 L 30 60 Q 28 58 30 55 Z"
        fill="#FFD600"
      />
      
      {/* Car Windows - Navy Blue */}
      <path
        d="M 38 45 L 40 42 L 48 42 L 48 50 L 38 50 Z"
        fill="#003D7A"
      />
      <path
        d="M 52 42 L 60 42 L 62 45 L 62 50 L 52 50 Z"
        fill="#003D7A"
      />
      
      {/* Front Light - Cyan */}
      <circle cx="32" cy="56" r="2" fill="#0098FF" />
      
      {/* Back Light - Cyan */}
      <circle cx="68" cy="56" r="2" fill="#0098FF" />
      
      {/* Wheels - White */}
      <circle cx="38" cy="62" r="3.5" fill="white" />
      <circle cx="62" cy="62" r="3.5" fill="white" />
      
      {/* Wheel Centers - Navy */}
      <circle cx="38" cy="62" r="1.5" fill="#003D7A" />
      <circle cx="62" cy="62" r="1.5" fill="#003D7A" />
      
      {/* Speed Lines - Cyan */}
      <line x1="20" y1="48" x2="28" y2="48" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="53" x2="28" y2="53" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="58" x2="28" y2="58" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}