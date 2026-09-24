import React, { useState } from 'react';
import { GymSettings, SystemUser } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';
import { authenticateUser } from '../utils/authStorage';
import { Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  settings: GymSettings;
  onLoginSuccess: (user: SystemUser) => void;
  securityMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ settings, onLoginSuccess, securityMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authenticateUser(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Gradients & Accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800/80 rounded-2xl shadow-2xl p-8 backdrop-blur-md relative z-10">
        {/* Academy Branding Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
            <GymLogoDisplay logo={settings.logo} gymName={settings.gymName} minSize={96} />
          </div>

          <h1 className="text-2xl font-bold font-raven tracking-wide text-white mb-1.5">
            {settings.gymName || 'ARTE SUAVE ACADEMY'}
          </h1>
          <p className="text-xs text-amber-500 font-medium italic max-w-xs">
            "{settings.slogan || 'Where Technique Conquers Strength'}"
          </p>
        </div>

        {/* Security Badge */}
        <div className="mb-6 bg-stone-950/80 border border-stone-800 rounded-lg p-2.5 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>10m Inactivity Security Auto-Logout</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded">
            Active
          </span>
        </div>

        {/* Security Timeout Notification */}
        {securityMessage && (
          <div className="mb-5 bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs rounded-xl p-3 flex items-start gap-2.5 shadow-md">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300 block">Security Session Timeout</span>
              <span>{securityMessage}</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-lg p-3 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter account username"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-10 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-red-900/30 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Demo Helper */}
        <div className="mt-8 pt-6 border-t border-stone-800/80 flex flex-col items-center">
          <p className="text-[11px] text-stone-500 mb-2">Default Initial Administrator Account:</p>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-xs bg-stone-950 border border-stone-800 hover:border-amber-600/60 text-stone-300 hover:text-amber-400 px-3 py-1.5 rounded-md flex items-center gap-2 transition-all"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Fill Admin Credentials (admin / admin123)</span>
          </button>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-6 text-center text-stone-600 text-xs">
        <p>BJJ Academy System • Secured Local Database Instance</p>
      </div>
    </div>
  );
};
