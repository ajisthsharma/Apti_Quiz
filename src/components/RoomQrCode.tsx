import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, QrCode as QrIcon, Smartphone } from 'lucide-react';

interface RoomQrCodeProps {
  roomCode: string;
}

export const RoomQrCode: React.FC<RoomQrCodeProps> = ({ roomCode }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Construct absolute join URL using actual origin
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?room=${roomCode.toUpperCase().trim()}`
    : `https://aptiquiz.app/join?room=${roomCode}`;

  useEffect(() => {
    if (!roomCode) return;
    QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#020617', // high contrast dark navy/black
        light: '#FFFFFF', // crisp white
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [joinUrl, roomCode]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `AptiQuiz_Room_${roomCode}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-xl flex flex-col items-center text-center space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
        <Smartphone className="w-4 h-4" /> Scan with Mobile to Join
      </div>

      {/* High-Contrast QR Code container */}
      <div className="p-3 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-4 border-slate-900 transition-transform hover:scale-105 duration-200">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Scan QR Code to join room ${roomCode}`}
            className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-lg"
          />
        ) : (
          <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-slate-400 text-xs font-mono">
            Generating QR...
          </div>
        )}
      </div>

      {/* Room code and URL display */}
      <div className="w-full">
        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[240px] mx-auto bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 mb-3">
          {joinUrl}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Copy direct join link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleDownloadQr}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Download QR code image for projector"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
