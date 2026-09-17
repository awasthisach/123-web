import React from 'react';
import { User, ShieldCheck, LogOut, CheckCircle2, Cloud } from 'lucide-react';

interface LoginProps {
  userEmail: string;
  userName: string;
  avatarUrl: string;
  isConnected: boolean;
  onToggleConnection: () => void;
}

export const Login: React.FC<LoginProps> = ({
  userEmail,
  userName,
  avatarUrl,
  isConnected,
  onToggleConnection,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 min-h-[36px]">
        <img
          src={avatarUrl}
          alt={userName}
          className="w-6 h-6 rounded-full ring-1 ring-zinc-300 dark:ring-zinc-600 object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none truncate max-w-[110px]">
            {userName}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Google Drive Connected
          </span>
        </div>
      </div>

      <button
        id="account-switch-btn"
        type="button"
        onClick={onToggleConnection}
        title={isConnected ? 'Switch Account or Disconnect' : 'Connect Google Drive'}
        className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
      >
        {isConnected ? (
          <LogOut className="w-4 h-4 text-zinc-500 hover:text-rose-500" />
        ) : (
          <Cloud className="w-4 h-4 text-blue-500" />
        )}
      </button>
    </div>
  );
};
