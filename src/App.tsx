import React, { useState, useEffect } from 'react';
import { LogOut, Menu, X, History, LogIn } from 'lucide-react';
import SymptomInput from './components/SymptomInput';
import PredictionResult from './components/PredictionResult';
import HistoryList from './components/HistoryList';
import AdminPanel from './components/AdminPanel';
import { User, Prediction } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('symptomsage_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'input' | 'result' | 'history' | 'admin'>('input');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [detectedSymptoms, setDetectedSymptoms] = useState<string[]>([]);
  const [originalText, setOriginalText] = useState('');
  const [userHistory, setUserHistory] = useState<Prediction[]>([]);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'resError'; msg: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [age, setAge] = useState<number | undefined>();
  const [gender, setGender] = useState<string | undefined>();

  const showAlert = (type: 'success' | 'resError', msg: string) => {
    setAlertMessage({ type, msg });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const fetchUserHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/history?userId=${user.id}`);
      const data = await res.json();
      setUserHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  // Register Patient / Administrator account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.get('fullName'),
          email: formData.get('email'),
          password: formData.get('password'),
          role: 'patient'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data.user);
      localStorage.setItem('symptomsage_session', JSON.stringify(data.user));
      form.reset();
      setActiveView('input');
      showAlert('success', 'Registration successful! Welcome aboard.');
    } catch (err: any) {
      showAlert('resError', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Login transaction
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password')
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data.user);
      localStorage.setItem('symptomsage_session', JSON.stringify(data.user));
      form.reset();
      setActiveView('input');
      showAlert('success', `Welcome back, ${data.user.fullName}!`);
    } catch (err: any) {
      showAlert('resError', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Skip Login / Guest Sandbox session bypass
  const handleGuestSession = () => {
    const guestUser: User = {
      id: `guest_${Date.now()}`,
      fullName: 'Guest User',
      email: 'guest@symptomsage.com',
      role: 'patient',
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    setActiveView('input');
    showAlert('success', 'Welcome! You are in guest mode.');
  };

  // Logout session clear
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('symptomsage_session');
    setPredictions([]);
    setDetectedSymptoms([]);
    setOriginalText('');
    setUserHistory([]);
    setActiveView('input');
    setAge(undefined);
    setGender(undefined);
    showAlert('success', 'Logged out successfully.');
  };

  // Symptom submission logic - CRITICAL FIX: Ensure state updates BEFORE view change
  const handleAnalyzeSymptoms = async (text: string, patientAge: number, patientGender: string) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userId: user?.id || null,
          age: patientAge,
          gender: patientGender
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.predictions.length === 0) {
        showAlert('resError', 'Could not identify any recognized symptoms. Please describe your symptoms more clearly.');
        return;
      }

      // IMPORTANT: Update all state values BEFORE changing view
      setDetectedSymptoms(data.symptoms);
      setOriginalText(text);
      setPredictions(data.predictions);
      setAge(patientAge);
      setGender(patientGender);

      // NOW switch to result view with setTimeout to ensure state is flushed
      setTimeout(() => {
        setActiveView('result');
        showAlert('success', 'Analysis complete! View your results below.');
      }, 0);

      // Fetch updated history if user is logged in (non-blocking)
      if (user) {
        fetchUserHistory().catch(err => console.error('History fetch error:', err));
      }
    } catch (err: any) {
      showAlert('resError', err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to input view
  const handleResetToInput = () => {
    setActiveView('input');
    setPredictions([]);
    setDetectedSymptoms([]);
    setOriginalText('');
    setAge(undefined);
    setGender(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 text-slate-900">
      {/* Alert notifications */}
      {alertMessage && (
        <div
          className={`fixed top-6 right-6 px-6 py-4 rounded-2xl font-bold text-sm shadow-lg z-50 border-2 animate-fade-in ${
            alertMessage.type === 'success'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-red-100 text-red-800 border-red-200'
          }`}
        >
          {alertMessage.msg}
        </div>
      )}

      {/* Navigation header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
              S
            </div>
            <h1 className="font-display font-black text-2xl text-slate-900 hidden sm:block">SymptomSage</h1>
          </div>

          {user && (
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setActiveView('input')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeView === 'input'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                New Check
              </button>
              <button
                onClick={() => {
                  setActiveView('history');
                  fetchUserHistory();
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                  activeView === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                History
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    activeView === 'admin'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Admin
                </button>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logged In</p>
                <p className="font-display font-black text-slate-900">{user.fullName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-red-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 hover:bg-slate-100 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('input')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Get Started</span>
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-slate-200 bg-slate-50 p-4 space-y-2">
            <button
              onClick={() => {
                setActiveView('input');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeView === 'input'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              New Check
            </button>
            <button
              onClick={() => {
                setActiveView('history');
                fetchUserHistory();
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                activeView === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  activeView === 'admin'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {!user ? (
          <div id="auth-container" className="max-w-2xl mx-auto space-y-8">
            {/* Login Tab */}
            <div className="bg-white rounded-3xl border-2 border-slate-150 shadow-lg overflow-hidden">
              <div className="bg-blue-600 text-white p-8 text-center">
                <h2 className="font-display font-black text-3xl mb-2">Welcome to SymptomSage</h2>
                <p className="text-blue-50 font-semibold">AI-powered symptom analysis & health recommendations</p>
              </div>

              <div className="p-8 space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500 font-bold">OR</span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 pt-4 border-t-2 border-slate-150">
                  <h3 className="font-display font-black text-lg text-slate-900">Create New Account</h3>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-blue-500"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>

                <button
                  onClick={handleGuestSession}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-150 text-slate-700 rounded-xl font-bold uppercase tracking-widest transition-all border-2 border-slate-200"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        ) : activeView === 'result' && predictions.length > 0 ? (
          <div className="max-w-6xl mx-auto">
            <PredictionResult
              originalText={originalText}
              detectedSymptoms={detectedSymptoms}
              predictions={predictions}
              onReset={handleResetToInput}
              age={age}
              gender={gender}
            />
          </div>
        ) : activeView === 'history' ? (
          <div className="max-w-6xl mx-auto">
            <HistoryList history={userHistory} />
          </div>
        ) : activeView === 'admin' ? (
          <AdminPanel onLogoutAdmin={handleLogout} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <SymptomInput onAnalyze={handleAnalyzeSymptoms} isLoading={isLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
