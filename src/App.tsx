import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Activity, 
  User, 
  Lock, 
  Mail, 
  Calendar, 
  BarChart2, 
  LogOut, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle,
  Stethoscope
} from 'lucide-react';
import { User as UserType, Prediction } from './types';
import SymptomInput from './components/SymptomInput';
import PredictionResult from './components/PredictionResult';
import HistoryList from './components/HistoryList';
import AdminPanel from './components/AdminPanel';

export default function App() {
  // Global auth states
  const [user, setUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('symptomsage_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeView, setActiveView] = useState<'home' | 'result' | 'history' | 'admin'>('home');

  // Input & analysis state
  const [inputText, setInputText] = useState('');
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [detectedSymptoms, setDetectedSymptoms] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // History state
  const [historyLogs, setHistoryLogs] = useState<Prediction[]>([]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminRole, setIsAdminRole] = useState(false);

  // General Notification messages
  const [alert, setAlert] = useState<{ type: 'success' | 'resError'; msg: string } | null>(null);

  useEffect(() => {
    // If logged in, fetch their session history
    if (user && user.role === 'patient') {
      fetchUserHistory();
    }
  }, [user]);

  const showAlert = (type: 'success' | 'resError', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const fetchUserHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/history?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Register Patient / Administrator account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showAlert('resError', 'Please fill in all registration fields.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: isAdminRole ? 'admin' : 'patient'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert('success', 'Profile compiled successfully! Please log in.');
        setAuthMode('login');
        setPassword('');
      } else {
        showAlert('resError', data.error || 'Failed to register account');
      }
    } catch (err) {
      showAlert('resError', 'Network error. Please try again.');
    }
  };

  // Login transaction
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showAlert('resError', 'Please enter your email and password.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem('symptomsage_session', JSON.stringify(data.user));
        showAlert('success', `Welcome back, ${data.user.fullName}!`);
        
        // Router allocation
        if (data.user.role === 'admin') {
          setActiveView('admin');
        } else {
          setActiveView('home');
        }
      } else {
        showAlert('resError', data.error || 'Invalid credentials.');
      }
    } catch (err) {
      showAlert('resError', 'Login server connection lost.');
    }
  };

  // Skip Login / Guest Sandbox session bypass (for extreme user simplicity & accessibility)
  const handleGuestSession = () => {
    const guestUser: UserType = {
      id: 'u_guest',
      fullName: 'Anonymous Guest',
      email: 'guest@symptomsage.local',
      role: 'patient',
      createdAt: new Date().toISOString()
    };
    setUser(guestUser);
    localStorage.setItem('symptomsage_session', JSON.stringify(guestUser));
    showAlert('success', 'Entered SymptomSage Sandbox under a Guest Profile.');
    setActiveView('home');
  };

  // Logout session clear
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('symptomsage_session');
    setPredictions([]);
    setDetectedSymptoms([]);
    setInputText('');
    setHistoryLogs([]);
    setActiveView('home');
  };

  // Symptom submission logic
  const handleAnalyzeSymptoms = async (text: string, age: number, gender: string) => {
    setIsLoading(true);
    setInputText(text);
    setPatientAge(age);
    setPatientGender(gender);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userId: user ? user.id : 'u_guest',
          age,
          gender
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDetectedSymptoms(data.symptoms);
        setPredictions(data.predictions);
        
        if (data.symptoms.length === 0) {
          showAlert('resError', 'Our ML model was unable to extract any symptoms from your description. Try typing in some of the live example ways.');
        } else {
          setActiveView('result');
          // Update patient history feed asynchronously if patient is signed in
          if (user && user.role === 'patient') {
            fetchUserHistory();
          }
        }
      } else {
        const err = await res.json();
        showAlert('resError', err.error || 'Symptom predictive ensemble crashed.');
      }
    } catch (err) {
      showAlert('resError', 'Diagnosis request failed to complete.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-800">
      
      {/* GLOBAL TOAST NOTICE */}
      {alert && (
        <div id="general-alert" className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-xl text-sm font-sans font-medium flex items-center gap-2.5 shadow-lg border z-50 animate-fade-in ${
          alert.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
          <span>{alert.msg}</span>
        </div>
      )}

      {/* CORE NAVIGATION BAR */}
      <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          
          {/* Logo Brand branding */}
          <div 
            onClick={() => user?.role === 'admin' ? setActiveView('admin') : setActiveView('home')} 
            className="flex items-center gap-3 cursor-pointer selection:bg-transparent"
          >
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/15 flex items-center justify-center font-black text-xl">
              S
            </div>
            <div>
              <span className="font-display font-black text-2xl text-blue-900 tracking-tight block leading-none">SymptomSage</span>
              <span className="text-[10px] font-mono tracking-[0.2em] font-extrabold uppercase text-blue-650 block mt-1">ML Health Advisor</span>
            </div>
          </div>

          {/* Nav items */}
          {user && (
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-8 text-sm font-display font-bold uppercase tracking-widest text-slate-400">
                {user.role === 'patient' && (
                  <>
                    <button 
                      onClick={() => setActiveView('home')} 
                      className={`hover:text-slate-800 transition-colors cursor-pointer border-b-2 pb-1 ${activeView === 'home' || activeView === 'result' ? 'text-blue-600 border-blue-600' : 'border-transparent'}`}
                    >
                      New Checkup
                    </button>
                    <button 
                      onClick={() => setActiveView('history')} 
                      className={`hover:text-slate-800 transition-colors cursor-pointer border-b-2 pb-1 ${activeView === 'history' ? 'text-blue-600 border-blue-600' : 'border-transparent'}`}
                    >
                      My History
                    </button>
                  </>
                )}
                {user.role === 'admin' && (
                  <button 
                    onClick={() => setActiveView('admin')} 
                    className={`hover:text-slate-800 transition-colors cursor-pointer border-b-2 pb-1 ${activeView === 'admin' ? 'text-blue-600 border-blue-600' : 'border-transparent'}`}
                  >
                    Admin Portal
                  </button>
                )}
              </nav>

              {/* Profile button card */}
              <div className="flex items-center gap-3 bg-slate-50 p-2 pl-4 pr-2 border-2 border-slate-100 rounded-2xl">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">WELCOME BACK</p>
                  <p className="text-xs font-black text-slate-800">{user.fullName}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-slate-200/50 text-slate-450 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                  title="Sign out of panel"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE LOWER NAV BAR */}
      {user && user.role === 'patient' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-100 flex py-3.5 z-40 shadow-xl justify-around text-[10px] font-black uppercase tracking-widest text-slate-400">
          <button 
            onClick={() => setActiveView('home')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeView === 'home' || activeView === 'result' ? 'text-blue-600' : ''}`}
          >
            <Activity className="w-5 h-5" />
            <span>Analyzer</span>
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeView === 'history' ? 'text-blue-600' : ''}`}
          >
            <Calendar className="w-5 h-5" />
            <span>History</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 cursor-pointer text-slate-450 hover:text-slate-700"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* MAIN CONTAINER CONTENT VIEWPORT */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 md:py-14">
        {user ? (
          /* ================= VIEW 1: AUTHENTICATED PANEL WORKSPACES ================= */
          <div className="space-y-8">
            {activeView === 'home' && (
              <div className="space-y-8 max-w-4xl mx-auto text-center">
                <div className="space-y-4 pb-4">
                  <h1 className="font-display font-black text-4xl md:text-6xl text-slate-900 tracking-tight leading-tight">
                    How are you <span className="text-blue-600">feeling</span> today?
                  </h1>
                  <p className="text-slate-500 font-sans font-semibold text-base max-w-xl mx-auto leading-relaxed">
                    Describe your symptoms in your own plain words. Our AI analyzes your inputs to identify clinical matching patterns instantly.
                  </p>
                </div>
                
                <SymptomInput 
                  onAnalyze={handleAnalyzeSymptoms} 
                  isLoading={isLoading} 
                />
              </div>
            )}

            {activeView === 'result' && (
              <div className="max-w-4xl mx-auto">
                <PredictionResult
                  originalText={inputText}
                  detectedSymptoms={detectedSymptoms}
                  predictions={predictions}
                  onReset={() => setActiveView('home')}
                  age={patientAge || undefined}
                  gender={patientGender || undefined}
                />
              </div>
            )}

            {activeView === 'history' && (
              <div className="max-w-4xl mx-auto">
                <HistoryList history={historyLogs} />
              </div>
            )}

            {activeView === 'admin' && user.role === 'admin' && (
              <AdminPanel onLogoutAdmin={handleLogout} />
            )}
          </div>
        ) : (
          /* ================= VIEW 2: PUBLIC GUEST LOGIN & REGS SCREENS ================= */
          <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-slate-150 shadow-2xl overflow-hidden p-8 md:p-10 animate-fade-in my-6">
            <div className="space-y-6 text-center">
              <div className="space-y-3">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border-2 border-blue-100/50">
                  <Stethoscope className="w-7 h-7 animate-pulse" />
                </div>
                <h2 className="font-display font-black text-3xl text-slate-900 tracking-tight">Welcome to SymptomSage</h2>
                <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium leading-relaxed">
                  Join our intelligent medical workspace to analyze symptoms, read health recommendations, and save histories.
                </p>
              </div>

              {/* Input Forms */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email Connection</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g., patient@example.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:outline-none transition-all text-slate-700 bg-slate-50/50 focus:bg-white shadow-inner focus:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Workspace Password</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:outline-none transition-all text-slate-700 bg-slate-50/50 focus:bg-white shadow-inner focus:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400 italic block mt-1.5 leading-normal">Default administrator profile credentials: admin@symptomsage.com / admin123</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-display font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Enter Workspace
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Full Legal Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Wisdom Alagiteh"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:outline-none transition-all text-slate-700 bg-slate-50/50 focus:bg-white shadow-inner focus:ring-0"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email Connection</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. wisdom@example.com"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:outline-none transition-all text-slate-700 bg-slate-50/50 focus:bg-white shadow-inner focus:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Compile Secret Password</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:border-blue-500 focus:outline-none transition-all text-slate-700 bg-slate-50/50 focus:bg-white shadow-inner focus:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2.5 py-1 select-none">
                    <input 
                      type="checkbox"
                      id="isAdminRoleCheck"
                      className="w-4 h-4 text-blue-600 border-2 border-slate-300 focus:ring-0 cursor-pointer rounded-md"
                      checked={isAdminRole}
                      onChange={(e) => setIsAdminRole(e.target.checked)}
                    />
                    <label htmlFor="isAdminRoleCheck" className="text-xs font-bold text-slate-600 cursor-pointer uppercase tracking-wide">
                      Register as Administrator
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-display font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Compile Account Profile</span>
                  </button>
                </form>
              )}

              {/* Mode toggle */}
              <div className="flex justify-between items-center text-xs font-bold font-sans border-t-2 border-slate-100 pt-5 text-slate-550">
                {authMode === 'login' ? (
                  <span>New patient? <button onClick={() => setAuthMode('register')} className="text-blue-650 hover:underline cursor-pointer font-extrabold uppercase tracking-wide">Compile Profile</button></span>
                ) : (
                  <span>Registered? <button onClick={() => setAuthMode('login')} className="text-blue-650 hover:underline cursor-pointer font-extrabold uppercase tracking-wide font-black">Login</button></span>
                )}

                {/* sandbox shortcut bypass block for uneducated / quick testing */}
                <button 
                  onClick={handleGuestSession} 
                  className="text-emerald-600 hover:underline font-black flex items-center gap-1 cursor-pointer uppercase tracking-wide text-[11px]"
                  title="Directly bypass authentication gates"
                >
                  <span>Quick Test guest</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t-2 border-slate-100 py-6 text-center text-[10px] font-bold tracking-widest uppercase text-slate-500 select-none">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© 2026 SymptomSage Machine Learning Diagnostics. Styled with Bold Typography aesthetic.</p>
          <p className="text-slate-350">Disclaimer: SymptomSage provides machine learning estimates for educational purposes, not authoritative medical decisions.</p>
        </div>
      </footer>
    </div>
  );
}
