import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  Trash2, 
  Plus, 
  Edit, 
  Check, 
  X, 
  BarChart2, 
  BookOpen, 
  Calendar, 
  Heart, 
  AlertCircle 
} from 'lucide-react';
import { Disease, SystemStats, User } from '../types';

interface AdminPanelProps {
  onLogoutAdmin: () => void;
}

export default function AdminPanel({ onLogoutAdmin }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'diseases' | 'users'>('stats');
  
  // States for dataset management
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  
  // Form states for adding/editing disease
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [diseaseName, setDiseaseName] = useState('');
  const [diseaseDesc, setDiseaseDesc] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
  // Dictionary options
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'resError'; msg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDictionary();
    fetchDiseases();
    fetchUsers();
    fetchStats();
  }, []);

  const fetchDictionary = async () => {
    try {
      const res = await fetch('/api/symptoms-dictionary');
      const data = await res.json();
      setAllSymptoms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiseases = async () => {
    try {
      const res = await fetch('/api/admin/diseases');
      const data = await res.json();
      setDiseases(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const showNotification = (type: 'success' | 'resError', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Submit add/edit disease
  const handleDiseaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseName.trim() || !diseaseDesc.trim() || selectedSymptoms.length === 0) {
      showNotification('resError', 'Please fill name, description, and select at least 1 symptom.');
      return;
    }

    setIsLoading(true);
    try {
      const url = isEditing && editingId 
        ? `/api/admin/diseases/${editingId}` 
        : '/api/admin/diseases';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: diseaseName,
          description: diseaseDesc,
          symptoms: selectedSymptoms
        })
      });

      if (res.ok) {
        showNotification('success', isEditing ? 'Disease modified in real-time classifier!' : 'New disease injected into the training dataset!');
        resetForm();
        fetchDiseases();
        fetchStats();
      } else {
        const errorData = await res.json();
        showNotification('resError', errorData.error || 'Operation failed');
      }
    } catch (err) {
      showNotification('resError', 'Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditDisease = (d: Disease) => {
    setIsEditing(true);
    setEditingId(d.id);
    setDiseaseName(d.name);
    setDiseaseDesc(d.description);
    setSelectedSymptoms(d.symptoms);
  };

  const deleteDisease = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this disease from the dataset? This directly alters ML scores.')) return;
    try {
      const res = await fetch(`/api/admin/diseases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'Disease successfully removed.');
        fetchDiseases();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Delete this patient and clear all of their historic prediction sessions?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'Patient files successfully purged.');
        fetchUsers();
        fetchStats();
      } else {
        const errorData = await res.json();
        showNotification('resError', errorData.error || 'Could not delete user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setDiseaseName('');
    setDiseaseDesc('');
    setSelectedSymptoms([]);
  };

  // Helper formatting values
  const getSymptomLabel = (key: string) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div id="admin-workspace-grid" className="space-y-8 animate-fade-in text-left">
      {/* Admin Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-3xl p-8 border-2 border-slate-150 shadow-sm">
        <div>
          <h1 className="font-display font-black text-3xl text-slate-900 tracking-tight leading-none">Administration Portal</h1>
          <p className="text-slate-500 font-semibold text-sm pt-1">Review aggregate diagnostic telemetry logs, fit ML condition classifiers, and manage user boundaries.</p>
        </div>
        <button
          onClick={onLogoutAdmin}
          className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-705 border-2 border-slate-200 hover:border-slate-305 text-xs font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
        >
          Close Console
        </button>
      </div>

      {feedback && (
        <div id="admin-toast" className={`p-5 rounded-2xl text-sm font-sans flex items-center gap-3 border-2 animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
            : 'bg-red-50 border-red-200 text-red-850 font-bold'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b-2 border-slate-150 pb-px">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-4 font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center gap-2 ${
            activeTab === 'stats' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>System Reports</span>
        </button>

        <button
          onClick={() => { setActiveTab('diseases'); resetForm(); }}
          className={`px-6 py-4 font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center gap-2 ${
            activeTab === 'diseases' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Clinical Dataset ({diseases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-4 font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Patient Management ({users.filter(u => u.role !== 'admin').length})</span>
        </button>
      </div>

      {/* CORE VIEW 1: ADVANCED STATS SYSTEM REPORTS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8 animate-fade-in">
          {/* Bento boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border-2 border-slate-150 shadow-sm flex items-center gap-6">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Registered Patients</span>
                <span className="font-display font-black text-5xl text-slate-950 tracking-tight leading-none">{stats.totalUsers}</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border-2 border-slate-150 shadow-sm flex items-center gap-6">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border-2 border-emerald-100 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Total Predictions</span>
                <span className="font-display font-black text-5xl text-slate-950 tracking-tight leading-none">{stats.totalPredictions}</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border-2 border-slate-150 shadow-sm flex items-center gap-6">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border-2 border-rose-100 shrink-0">
                <Heart className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">AVG ML CERTAINTY</span>
                <span className="font-display font-black text-5xl text-slate-950 tracking-tight leading-none">{stats.averageConfidence}%</span>
              </div>
            </div>
          </div>

          {/* Graphics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custom Bar Chart - Disease Distribution */}
            <div className="bg-white rounded-3xl border-2 border-slate-150 p-8 space-y-5 shadow-sm">
              <div>
                <h3 className="font-display font-black text-lg text-slate-900 tracking-tight leading-none">Disease Diagnosis Frequency</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">Visual distributions of top ML outputs resolved from history logs.</p>
              </div>

              {stats.diseaseDistribution.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm font-sans text-slate-400 italic">
                  No prediction telemetry collected yet.
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {stats.diseaseDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>{item.name}</span>
                        <span className="font-black text-slate-900">{item.value} runs</span>
                      </div>
                      <div className="h-5 bg-slate-50 border-2 border-slate-150 rounded-xl overflow-hidden relative shadow-sm">
                        <div 
                          className="h-full bg-blue-600 rounded-r-lg transition-all duration-700" 
                          style={{
                            width: `${(item.value / Math.max(...stats.diseaseDistribution.map(x=>x.value))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prediction trends chart */}
            <div className="bg-white rounded-3xl border-2 border-slate-150 p-8 space-y-5 shadow-sm">
              <div>
                <h3 className="font-display font-black text-lg text-slate-900 tracking-tight leading-none">7-Day Prediction Volume</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">Active daily usage trajectory analysis.</p>
              </div>

              <div className="h-60 flex flex-col justify-between pt-4">
                <div className="flex items-end h-44 gap-2.5 border-b-2 border-l-2 border-slate-150 px-3 pb-2 select-none">
                  {stats.predictionTrends.map((t, idx) => {
                    const maxVal = Math.max(...stats.predictionTrends.map(x=>x.count), 1);
                    const percentageHeight = (t.count / maxVal) * 85; // cap at 85% for nice top buffer
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative">
                        {/* Tooltip */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded-md h-fit whitespace-nowrap shadow-md pointer-events-none z-10 font-mono font-bold">
                          {t.count} run{t.count !== 1 && 's'}
                        </div>
                        <div 
                          className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-xl transition-all duration-500 shadow-sm"
                          style={{ height: `${percentageHeight}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between px-3 text-[10px] font-black font-sans text-slate-400 uppercase tracking-widest pt-2">
                  {stats.predictionTrends.map((t, idx) => {
                    const dateParts = t.date.split('-');
                    return (
                      <span key={idx} className="flex-1 text-center truncate">
                        {dateParts[1]}/{dateParts[2]}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Active Leaders Grid */}
          <div className="bg-white rounded-3xl border-2 border-slate-150 p-8 shadow-sm">
            <h3 className="font-display font-black text-xl text-slate-900 mb-4 tracking-tight leading-none text-left">Top Enrolled Diagnostic Patients</h3>
            {stats.activeUsers.length === 0 ? (
              <div className="text-sm font-semibold italic text-slate-400 py-6 text-center">No active users logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-150 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                      <th className="py-4 px-4">Patient Name</th>
                      <th className="py-4 px-4">Email Connection</th>
                      <th className="py-4 px-4 text-right">Analyzer Run Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.activeUsers.map((u, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 text-sm font-semibold text-slate-705">
                        <td className="py-4 px-4 font-black">{u.name}</td>
                        <td className="py-4 px-4 text-slate-500 font-medium">{u.email}</td>
                        <td className="py-4 px-4 font-mono text-right text-slate-900 font-black">{u.predictionsCount} times</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CORE VIEW 2: CLINICAL DATA CLASSIFIER DATASETS CONFIGURATION */}
      {activeTab === 'diseases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Disease List */}
          <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-slate-150 p-8 space-y-5 shadow-sm">
            <h3 className="font-display font-black text-xl text-slate-900 tracking-tight leading-none">Diagnostic Classifier Dataset</h3>
            
            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
              {diseases.map(d => (
                <div key={d.id} className="p-5 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-150 rounded-2xl flex justify-between gap-4 transition-all">
                  <div className="space-y-2.5 max-w-xl">
                    <h4 className="font-display font-black text-slate-900 text-lg tracking-tight">{d.name}</h4>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{d.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {d.symptoms.map(s => (
                        <span key={s} className="text-[10px] font-black font-mono bg-white border-2 border-slate-200 text-slate-700 px-3 py-1 rounded-xl shadow-sm">
                          {getSymptomLabel(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0 justify-center">
                    <button
                      onClick={() => startEditDisease(d)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl border border-transparent hover:border-blue-150 transition-all cursor-pointer bg-white shadow-sm"
                      title="Edit Disease symptoms"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDisease(d.id)}
                      className="p-2.5 text-slate-400 hover:text-red-650 hover:bg-red-50/50 rounded-xl border border-transparent hover:border-red-150 transition-all cursor-pointer bg-white shadow-sm"
                      title="Delete Disease record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Create/Edit */}
          <div className="bg-white rounded-3xl border-2 border-slate-150 p-8 h-fit space-y-6 sticky top-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight leading-none">
                {isEditing ? 'Edit Classifier' : 'Add Classifier'}
              </h3>
              {isEditing && (
                <button 
                  onClick={resetForm}
                  className="p-1.5 px-3 hover:bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-xl border-2 border-slate-200"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleDiseaseSubmit} className="space-y-5 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">Disease Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-150 rounded-2xl text-sm font-semibold focus:outline-none focus:border-slate-400 bg-slate-50/50 focus:bg-white transition-all placeholder-slate-400 text-slate-900"
                  placeholder="e.g., Asthma"
                  value={diseaseName}
                  onChange={(e) => setDiseaseName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">Medical Description</label>
                <textarea
                  required
                  className="w-full h-28 px-4 py-3 border-2 border-slate-150 rounded-2xl text-sm font-semibold focus:outline-none focus:border-slate-400 bg-slate-50/50 focus:bg-white transition-all leading-relaxed placeholder-slate-400 text-slate-900"
                  placeholder="Clinical overview of symptoms..."
                  value={diseaseDesc}
                  onChange={(e) => setDiseaseDesc(e.target.value)}
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">Core Diagnostic Symptoms</label>
                <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto border-2 border-slate-150 p-3 rounded-2xl bg-slate-55/40 font-semibold shadow-inner">
                  {allSymptoms.map(sym => {
                    const checked = selectedSymptoms.includes(sym);
                    return (
                      <button
                        type="button"
                        key={sym}
                        onClick={() => handleSymptomToggle(sym)}
                        className={`flex items-center gap-2 text-[10px] text-left p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                          checked 
                            ? 'bg-blue-600 border-blue-600 text-white font-black' 
                            : 'bg-white hover:bg-slate-50 border-slate-150 text-slate-700 font-bold shadow-sm'
                        }`}
                      >
                        {checked ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{getSymptomLabel(sym)}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 font-bold block">Selected: {selectedSymptoms.length} indications.</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-slate-900 hover:bg-slate-950 font-display font-black text-xs uppercase tracking-widest text-white rounded-2xl shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
              >
                {isLoading ? 'Injecting...' : isEditing ? 'Re-Fit Diagnostics' : 'Inject Classifier'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CORE VIEW 3: USER PROFILES DATABASES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border-2 border-slate-150 p-8 shadow-sm">
          <h3 className="font-display font-black text-xl text-slate-900 mb-5 tracking-tight leading-none text-left">Registered Diagnosed Patients</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-150 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                  <th className="py-4 px-4">User ID</th>
                  <th className="py-4 px-4">Full Legal Name</th>
                  <th className="py-4 px-4">Registered Email</th>
                  <th className="py-4 px-4">System Role</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-4 text-right">Account Controls</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold text-slate-705">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">{u.id}</td>
                    <td className="py-4 px-4 font-black text-slate-900">{u.fullName}</td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] uppercase font-mono font-black border-2 shadow-sm ${
                        u.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right">
                      {u.id === 'u_admin' ? (
                        <span className="text-xs font-bold text-slate-400 italic">Protected</span>
                      ) : (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-red-600 hover:text-white border-2 border-red-200 hover:border-red-650 hover:bg-red-600 text-xs font-black uppercase tracking-widest p-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm bg-white"
                        >
                          Revoke Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
