import React, { useEffect, useRef } from 'react';

interface SpaceBackgroundProps {
  isCalmMode?: boolean; // When active quiz is in progress, calm down particle movement
}

export const FloatingBubblesBackground: React.FC<SpaceBackgroundProps> = ({ isCalmMode = false }) => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const followPointer = (event: PointerEvent) => {
      backgroundRef.current?.style.setProperty('--pointer-x', `${event.clientX}px`);
      backgroundRef.current?.style.setProperty('--pointer-y', `${event.clientY}px`);
    };
    window.addEventListener('pointermove', followPointer, { passive: true });
    return () => window.removeEventListener('pointermove', followPointer);
  }, []);

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
      ref={backgroundRef}
      aria-hidden="true"
      className="arena-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090b]"
    >
      {/* Deep charcoal gradient with a restrained lime glow at top */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-15%,rgba(198,255,0,0.07),rgba(9,9,11,0.98))]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

      {/* Soft Nebula Ambient Light */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#c6ff00]/[0.035] blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#c6ff00]/[0.045] blur-[120px]" />

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

        {/* Diagonal lime meteor streaks */}
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
          background: linear-gradient(90deg, rgba(198, 255, 0, 0.9), rgba(82, 229, 255, 0.36), transparent);
          box-shadow: 0 0 7px rgba(198, 255, 0, 0.5);
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
