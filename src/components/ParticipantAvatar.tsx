import React from 'react';

interface AvatarProps {
  id?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_PALETTES = [
  { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-100', icon: '⚡' },
  { bg: 'from-indigo-500 to-purple-600', text: 'text-indigo-100', icon: '🌌' },
  { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-100', icon: '🌲' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-amber-100', icon: '🔥' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-rose-100', icon: '⭐' },
  { bg: 'from-violet-500 to-fuchsia-600', text: 'text-violet-100', icon: '🔮' },
  { bg: 'from-sky-400 to-indigo-600', text: 'text-sky-100', icon: '🚀' },
  { bg: 'from-teal-400 to-emerald-600', text: 'text-teal-100', icon: '🛡️' },
];

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const ParticipantAvatar: React.FC<AvatarProps> = ({
  id = '',
  name = 'Participant',
  size = 'md',
  className = '',
}) => {
  const seed = id || name;
  const hash = getHash(seed);
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];

  // Derive initials
  const parts = name.trim().split(/\s+/).filter(Boolean);
  let initials = 'A';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-14 h-14 text-base font-bold shadow-lg',
    xl: 'w-20 h-20 text-xl font-black shadow-xl ring-4 ring-amber-400/40',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br ${palette.bg} ${sizeClasses} ${className} select-none border border-white/20`}
      title={name}
      aria-label={`Avatar for ${name}`}
    >
      <span className={`font-mono tracking-wider font-extrabold ${palette.text}`}>
        {initials}
      </span>
      {size === 'xl' && (
        <span className="absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700">
          {palette.icon}
        </span>
      )}
    </div>
  );
};
