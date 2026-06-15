import React, { useState } from 'react';
import { Prediction } from '../types';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle
} from 'lucide-react';

interface HistoryListProps {
  history: Prediction[];
}

export default function HistoryList({ history }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'text-rose-600 bg-rose-50 border border-rose-100';
    if (prob >= 50) return 'text-amber-600 bg-amber-50 border border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
  };

  const getSymptomLabel = (key: string) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (history.length === 0) {
    return (
      <div id="empty-history" className="bg-white rounded-3xl border-2 border-slate-150 p-12 text-center shadow-lg animate-fade-in space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border-2 border-slate-155">
          <Calendar className="w-8 h-8 text-slate-400 animate-pulse" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">No Patient History Found</h3>
          <p className="text-slate-500 font-semibold text-sm max-w-xs mx-auto mt-2 leading-relaxed">
            Your diagnosed checkups are saved here automatically once you submit symptoms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="patient-history-grid" className="space-y-6 animate-fade-in text-left">
      <div className="flex items-center justify-between mb-4 border-b-2 border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Your Diagnostic History</h2>
        </div>
        <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{history.length} Logs</span>
      </div>

      <div className="space-y-5">
        {history.map((record) => {
          const isExpanded = expandedId === record.id;
          return (
            <div 
              key={record.id} 
              className="bg-white rounded-3xl border-2 border-slate-150 shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Header summarized block */}
              <div 
                onClick={() => toggleExpand(record.id)}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 md:p-8 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-black text-slate-900 text-xl md:text-2xl tracking-tight leading-none block">
                      {record.predictedDisease}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-black shadow-sm border ${getProbabilityColor(record.confidenceScore)}`}>
                      {record.confidenceScore}% certainty
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-450" />
                      {new Date(record.predictionDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {record.age && record.gender && (
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-150 rounded-lg font-black uppercase text-[10px] tracking-wider shrink-0">
                        {record.age} y/o {record.gender}
                      </span>
                    )}
                    <span className="truncate max-w-[280px] italic">
                      Query: "{record.originalText}"
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-auto">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-600">
                    {isExpanded ? 'Hide' : 'Details'}
                  </span>
                  <div className="p-1.5 border-2 border-slate-200 rounded-xl text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-800" /> : <ChevronDown className="w-4 h-4 text-slate-800" />}
                  </div>
                </div>
              </div>

              {/* Expansion Detail panel */}
              {isExpanded && (
                <div className="border-t-2 border-slate-150 p-8 md:p-10 bg-slate-50/30 space-y-8 animate-fade-in text-sm">
                  {/* Original text & Symptoms map */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Your Description:</span>
                      <p className="p-5 bg-white rounded-2xl border-2 border-slate-150 text-slate-705 font-semibold italic shadow-inner">
                        "{record.originalText}"
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recognized Symptoms:</span>
                      <div className="flex flex-wrap gap-2">
                        {record.extractedSymptoms.map(s => (
                          <span key={s} className="px-3.5 py-1.5 bg-slate-100 border-2 border-slate-200 text-slate-750 font-bold text-xs rounded-xl shadow-sm">
                            {getSymptomLabel(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation and recommendations */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Clinical Explanation:</span>
                    <p className="p-6 bg-white rounded-2xl border-2 border-slate-150 text-slate-705 font-semibold leading-relaxed max-w-4xl shadow-sm">
                      {record.explanation}
                    </p>
                  </div>

                  {/* Recommended list advice */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3.5">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Recommended Home Care:</span>
                      <ul className="space-y-2">
                        {record.recommendations.homeCare.map((h, idx) => (
                          <li key={idx} className="flex gap-3 bg-white border-2 border-slate-100 p-4 rounded-xl text-slate-710 font-bold">
                            <span className="text-emerald-500 font-black shrink-0">&#10003;</span>
                            <span className="leading-relaxed">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3.5">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Clinician Diagnostics advice:</span>
                      <ul className="space-y-2">
                        {record.recommendations.medicalAdvice.map((m, idx) => (
                          <li key={idx} className="flex gap-3 bg-slate-900 text-white p-4 rounded-xl font-semibold">
                            <span className="text-slate-300 font-black shrink-0">{idx + 1}.</span>
                            <span className="leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Warning banner */}
                  {record.recommendations.emergencyWarning && (
                    <div className="bg-red-50 border-2 border-red-150 p-6 rounded-2xl flex gap-4 text-red-755">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <span className="font-black text-xs uppercase tracking-widest block mb-1">Critical Warning Flags:</span>
                        <p className="font-semibold leading-relaxed text-sm">{record.recommendations.emergencyWarning}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
