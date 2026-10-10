import React from 'react';

interface SpaceBackgroundProps {
  isCalmMode?: boolean; // When active quiz is in progress, calm down particle movement
}

export const FloatingBubblesBackground: React.FC<SpaceBackgroundProps> = ({ isCalmMode = false }) => {
  // Stars with varied coordinates, sizes, and pulse timing
  const stars = [
    { top: '12%', left: '15%', size: 2, delay: '0s', duration: '4s' },
    { top: '24%', left: '80%', size: 3, delay: '1s', duration: '5s' },
    { top: '38%', left: '42%', size: 1.5, delay: '2s', duration: '3s' },
    { top: '65%', left: '20%', size: 2.5, delay: '0.5s', duration: '4.5s' },
    { top: '78%', left: '72%', size: 2, delay: '1.5s', duration: '3.5s' },
    { top: '88%', left: '35%', size: 1.5, delay: '3s', duration: '4s' },
    { top: '18%', left: '60%', size: 2, delay: '2.5s', duration: '6s' },
    { top: '50%', left: '90%', size: 1, delay: '0.8s', duration: '3s' },
    { top: '82%', left: '10%', size: 3, delay: '1.2s', duration: '5s' },
    { top: '6%', left: '92%', size: 2, delay: '2.1s', duration: '4s' },
    { top: '94%', left: '55%', size: 1.5, delay: '0.3s', duration: '4.2s' },
  ];

  // Soft meteors moving diagonally
  const meteors = [
    { top: '5%', left: '70%', delay: '0s', duration: '7s' },
    { top: '25%', left: '90%', delay: '3.5s', duration: '9s' },
    { top: '55%', left: '85%', delay: '1.8s', duration: '8s' },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[#080D1B]"
    >
      {/* Deep Midnight gradient with subtle indigo glow at top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(8,13,27,0.98))]" />

      {/* Soft Nebula Ambient Light */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-indigo-600/5 blur-[120px]" />

      {/* Twinkling Stars */}
      <div className={`w-full h-full relative transition-opacity duration-700 ${isCalmMode ? 'opacity-30' : 'opacity-80'}`}>
        {stars.map((s, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-white/70 star-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}

        {/* Diagonal Meteors */}
        {!isCalmMode &&
          meteors.map((m, idx) => (
            <div
              key={`meteor-${idx}`}
              className="absolute meteor-streak"
              style={{
                top: m.top,
                left: m.left,
                animationDelay: m.delay,
                animationDuration: m.duration,
              }}
            />
          ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
        .star-twinkle {
          animation: twinkle infinite ease-in-out;
        }
        @keyframes meteorPass {
          0% {
            transform: translate3d(0, 0, 0) rotate(-45deg);
            opacity: 0;
            width: 0px;
          }
          10% {
            opacity: 0.8;
            width: 90px;
          }
          25% {
            transform: translate3d(-300px, 300px, 0) rotate(-45deg);
            opacity: 0;
            width: 140px;
          }
          100% {
            transform: translate3d(-300px, 300px, 0) rotate(-45deg);
            opacity: 0;
            width: 0px;
          }
        }
        .meteor-streak {
          height: 1.5px;
          background: linear-gradient(90deg, rgba(34, 211, 238, 0.8), rgba(99, 102, 241, 0.4), transparent);
          box-shadow: 0 0 6px rgba(34, 211, 238, 0.6);
          border-radius: 9999px;
          animation: meteorPass infinite linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .star-twinkle, .meteor-streak {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
