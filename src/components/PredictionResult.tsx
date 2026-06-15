import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  Clipboard, 
  CheckSquare, 
  UserCheck, 
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Recommendation } from '../types';

interface Prediction {
  diseaseName: string;
  probability: number;
  explanation: string;
  recommendations: Recommendation;
}

interface PredictionResultProps {
  originalText: string;
  detectedSymptoms: string[];
  predictions: Prediction[];
  onReset: () => void;
  age?: number;
  gender?: string;
}

export default function PredictionResult({ 
  originalText, 
  detectedSymptoms, 
  predictions, 
  onReset,
  age,
  gender
}: PredictionResultProps) {
  const [activeTab, setActiveTab] = useState<'homeCare' | 'medical' | 'warning'>( 'homeCare');

  const topPrediction = predictions[0];
  const listAlternatives = predictions.slice(1);

  // Helper to color progress bars or gauges
  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'bg-rose-500';
    if (prob >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getSymptomLabel = (key: string) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div id="prediction-result-panel" className="space-y-8 animate-fade-in text-left">
      {/* Top Details & Header Bar */}
      <div className="flex justify-between items-end mb-6 border-b-2 border-slate-100 pb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Analysis Output</h2>
        <div className="px-4 py-1.5 bg-green-150 text-green-800 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-green-200 shadow-sm">
          STABLE STATUS
        </div>
      </div>

      {/* Primary Prediction Card */}
      <div className="bg-white border-2 border-slate-150 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest leading-none">Most Likely Condition</p>
            <h1 id="disease-title" className="font-display font-black text-4xl md:text-5.51 text-slate-900 tracking-tight leading-none pt-1">
              {topPrediction ? topPrediction.diseaseName : 'Inconclusive Analysis'}
            </h1>
            <p className="text-slate-500 font-semibold text-sm max-w-xl leading-relaxed pt-2">
              Our predictive algorithms identified a strong correlation with your input descriptions. Please examine the clinical breakdown.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-150 rounded-2xl p-4.5 shadow-sm text-right self-stretch md:self-auto justify-between md:justify-end shrink-0">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Confidence</p>
              <p className="text-[10px] font-black tracking-wider uppercase text-blue-600 mt-0.5">
                {topPrediction && topPrediction.probability > 75 ? 'HIGH CERTAINTY' : topPrediction && topPrediction.probability > 45 ? 'MODERATE' : 'LOW'}
              </p>
            </div>
            <div className="text-[40px] font-black text-green-600 leading-none tracking-tighter">
              {topPrediction ? `${topPrediction.probability}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Clinical Explanation Subcard */}
        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border-2 border-slate-150/60 shadow-inner">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-450" />
            <span>AI Clinical Explanation</span>
          </p>
          <p className="text-slate-700 font-semibold leading-relaxed italic text-sm">
            "{topPrediction ? topPrediction.explanation : 'No explanation available.'}"
          </p>
        </div>
      </div>

      {/* Grid: Mapped Symptoms and Alternative Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Detected Symptoms Box */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-3">
            <Clipboard className="w-5 h-5 text-slate-400" />
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-800">Detected Symptoms</h3>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-150 shadow-inner">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-2">My Description:</span>
            <p className="text-xs font-semibold italic text-slate-600 leading-relaxed">
              "{originalText}"
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block">Standardized Indicators (NLP):</span>
            <div className="flex flex-wrap gap-2">
              {detectedSymptoms.map(sym => (
                <span 
                  key={sym} 
                  className="px-4 py-2 bg-slate-50 rounded-xl font-bold text-slate-700 border-2 border-slate-200 text-xs transition-colors hover:border-blue-500 hover:text-blue-700 inline-flex items-center gap-2 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 bg-blue-550 rounded-full animate-pulse"></span>
                  {getSymptomLabel(sym)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alternative Probability Distribution matches */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-3">
            <Activity className="w-5 h-5 text-slate-400" />
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-800">Alternative Rank Distributions</h3>
          </div>

          <div className="space-y-5">
            {predictions.map((p, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-semibold ${idx === 0 ? 'text-slate-900 font-extrabold' : 'text-slate-500'}`}>
                    {idx + 1}. {p.diseaseName} {idx === 0 && '(Primary)'}
                  </span>
                  <span className="font-mono font-black text-slate-700">{p.probability}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-slate-100">
                  <div 
                    className={`${getProbabilityColor(p.probability)} h-full rounded-full transition-all duration-500`} 
                    style={{ width: `${p.probability}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demographic personalization explanation notice */}
      {age && gender && (
        <div id="demographics-personalized-banner" className="bg-blue-50/70 border-2 border-slate-150 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              {age}
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block leading-none">Diagnostic Persona</span>
              <p className="text-xs font-black text-slate-800 pt-1">
                Patient Group: <span className="text-blue-700">{age} Year Old {gender}</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-800 font-extrabold italic leading-relaxed text-center md:text-right max-w-sm">
            "Based on your age group and gender, the following recommendations are suggested."
          </p>
        </div>
      )}

      {/* Tabbed Advice Box */}
      <div className="bg-white rounded-3xl border-2 border-slate-150 shadow-sm overflow-hidden">
        <div className="flex border-b-2 border-slate-150 bg-slate-50">
          <button
            onClick={() => setActiveTab('homeCare')}
            className={`flex-1 py-4 text-center font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'homeCare' 
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span>Home Advice</span>
          </button>
          
          <button
            onClick={() => setActiveTab('medical')}
            className={`flex-1 py-4 text-center font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'medical' 
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4 text-blue-500" />
            <span>Next Steps</span>
          </button>

          <button
            onClick={() => setActiveTab('warning')}
            className={`flex-1 py-4 text-center font-display font-black uppercase tracking-widest text-xs transition-all border-b-4 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'warning' 
                ? 'border-red-600 text-red-600 bg-red-50/20' 
                : 'border-transparent text-slate-550 hover:text-red-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Warnings</span>
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'homeCare' && (
            <div className="space-y-5">
              <h4 className="font-display font-black uppercase tracking-wider text-xs text-slate-400">Home Care & Support Advice:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topPrediction?.recommendations.homeCare.map((item, id) => (
                  <li key={id} className="flex gap-3 bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl text-slate-800 text-sm font-bold">
                    <span className="w-2 h-2 bg-blue-450 rounded-full mt-2 shrink-0"></span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-5">
              <h4 className="font-display font-black uppercase tracking-wider text-xs text-slate-400">Clinician Diagnostics & Consultations:</h4>
              <ul className="space-y-4">
                {topPrediction?.recommendations.medicalAdvice.map((item, id) => (
                  <li key={id} className="flex items-center gap-4 bg-slate-900 text-white p-5 rounded-2xl">
                    <div className="w-7 h-7 bg-white text-slate-900 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 border-slate-900">
                      {id + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-relaxed">{item}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'warning' && (
            <div className="space-y-5">
              <h4 className="font-display font-semibold text-red-800 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Critical Clinical Warning Indicators:
              </h4>
              <div className="bg-red-50 border-2 border-red-150 p-6 rounded-2xl flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-650 rounded-full flex items-center justify-center shrink-0 border-2 border-red-200">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <span className="font-sans font-black text-red-800 text-xs uppercase tracking-widest block">Emergency Guidance</span>
                  <p className="text-red-700 font-semibold text-sm leading-relaxed">
                    {topPrediction?.recommendations.emergencyWarning || 'Please proceed to an urgent screening clinic or seek immediate hospital diagnostics if acute breathing difficulties emerge.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Action */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-3 font-display font-black uppercase tracking-widest text-xs px-8 py-5 bg-slate-100 border-2 border-slate-200 hover:bg-slate-250 hover:border-slate-300 text-slate-700 rounded-2xl transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Symptom Checkup</span>
        </button>
      </div>
    </div>
  );
}
