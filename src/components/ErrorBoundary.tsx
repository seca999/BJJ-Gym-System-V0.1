import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldCheck, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      // Clear potentially corrupt storage keys while keeping backups
      const keysToClear = [
        'bjj_gym_initialized_v11_matboard_grid_fixed',
        'bjj_gym_members_v8',
        'bjj_gym_payments_v8',
        'bjj_gym_attendance_v8',
        'bjj_gym_classes_v8',
        'bjj_gym_settings_v8',
        'bjj_gym_coaches_v8',
        'bjj_gym_timetable_v11_matboard',
        'bjj_gym_plans_v8',
        'bjj_restored_disk_session_v1',
      ];
      keysToClear.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-xl w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                System Recovery & Diagnostic Mode
              </h2>
              <p className="text-xs sm:text-sm text-stone-400">
                The application encountered an unexpected issue while rendering after the update. We prevented the screen from freezing.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl text-left space-y-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block font-mono">
                  Error Message
                </span>
                <p className="text-xs font-mono text-red-300 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full sm:w-auto px-5 py-3 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 font-bold rounded-xl text-xs transition-all border border-stone-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Reset Cached Data & Reload</span>
              </button>
            </div>

            <div className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database and student records remain safe on disk.</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
