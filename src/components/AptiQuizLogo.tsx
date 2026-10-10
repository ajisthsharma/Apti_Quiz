import React from 'react';

interface AptiQuizLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  subBadge?: string;
}

export const AptiQuizLogo: React.FC<AptiQuizLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
  subBadge,
}) => {
  const iconDimensions = {
    sm: { box: 28, stroke: 2 },
    md: { box: 38, stroke: 2.2 },
    lg: { box: 48, stroke: 2.5 },
    xl: { box: 64, stroke: 3 },
  }[size];

  const textClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Original Geometric Icon: Neural 'A' + Precision Target + Lightning Chevron */}
      <div
        className="relative shrink-0 rounded-2xl p-0.5 bg-gradient-to-br from-[#c6ff00] via-[#52e5ff] to-[#c6ff00] shadow-lg shadow-[#c6ff00]/10"
        style={{ width: iconDimensions.box, height: iconDimensions.box }}
      >
        <div className="w-full h-full bg-[#09090b] rounded-[14px] flex items-center justify-center overflow-hidden p-1">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Outer precision focus ring arc */}
            <circle
              cx="24"
              cy="24"
              r="21"
              stroke="url(#aq_cyan_grad)"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              strokeOpacity="0.45"
            />

            {/* Dynamic Geometric 'A' apex with lightning impulse */}
            <path
              d="M24 6L11 38H18L21.5 29H29M24 6L37 38H30L26.5 29"
              stroke="url(#aq_cyan_grad)"
              strokeWidth={iconDimensions.stroke * 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Neural Speed Lightning Crossbar */}
            <path
              d="M16 26L26 21L21 28L32 24"
              stroke="#38BDF8"
              strokeWidth={iconDimensions.stroke * 1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
            />

            {/* Center Accuracy Core Target Node */}
            <circle
              cx="24"
              cy="15"
              r="3.5"
              fill="url(#aq_cyan_grad)"
              className="animate-pulse"
            />
            <circle cx="24" cy="15" r="1.5" fill="#FFFFFF" />

            {/* Gradients */}
            <defs>
              <linearGradient id="aq_cyan_grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c6ff00" />
              <stop offset="0.5" stopColor="#52e5ff" />
              <stop offset="1" stopColor="#c6ff00" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-white ${textClasses}`}>
              Apti<span className="text-[#c6ff00]">Quiz</span>
            </span>
            {subBadge && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[#c6ff00]/10 text-[#d5ff65] border border-[#c6ff00]/20">
                {subBadge}
              </span>
            )}
          </div>
          {size !== 'sm' && !subBadge && (
            <span className="text-[9px] font-semibold tracking-[.16em] uppercase text-[#92929f] mt-1">
              Multiplayer Aptitude Arena
            </span>
          )}
        </div>
      )}
    </div>
  );
};
