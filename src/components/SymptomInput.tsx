import React, { useState } from 'react';
import { Sparkles, HelpCircle, Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface SymptomInputProps {
  onAnalyze: (text: string, age: number, gender: string) => void;
  isLoading: boolean;
}

const LIVE_EXAMPLES = [
  "I have been feeling hot for three days and my body aches with severe chills.",
  "My stomach hurts, I have stomach cramps and I have been vomiting since last night.",
  "I have a runny nose, sneezing fits, a scratchy sore throat, and a mild headache."
];

const SUPPORTED_SYMPTOMS = [
  { key: 'fever', label: 'Fever / High Temperature', primaryWord: 'fever', examples: 'Fever, feeling hot, high body temperature, feverish' },
  { key: 'headache', label: 'Headache / Migraine', primaryWord: 'headache', examples: 'Head pain, migraine, throbbing head' },
  { key: 'stomach_pain', label: 'Stomach Pain / Cramps', primaryWord: 'stomach pain', examples: 'Stomach pain, belly ache, abdominal cramps, gut hurts' },
  { key: 'fatigue', label: 'Fatigue / Weakness', primaryWord: 'fatigue', examples: 'Feeling weak, tired, exhausted, weariness, low energy' },
  { key: 'cough', label: 'Cough', primaryWord: 'cough', examples: 'Dry cough, throat phlegm, coughing fits' },
  { key: 'vomiting', label: 'Vomiting / Throwing Up', primaryWord: 'vomiting', examples: 'Puking, throwing up, vomited' },
  { key: 'nausea', label: 'Nausea / Feeling Sick', primaryWord: 'nausea', examples: 'Nauseous, queasy, sick to my stomach' },
  { key: 'diarrhea', label: 'Diarrhea', primaryWord: 'diarrhea', examples: 'Loose stool, runny tummy, watery stomach' },
  { key: 'shortness_of_breath', label: 'Shortness of Breath', primaryWord: 'shortness of breath', examples: 'Hard to breathe, tight chest, breathless, dyspnea' },
  { key: 'chills', label: 'Chills / Shivering', primaryWord: 'chills', examples: 'Shivering, shaking with cold, rigors' },
  { key: 'sweating', label: 'Sweating / Night Sweats', primaryWord: 'sweating', examples: 'Perspiration, heavy sweat, night sweats' },
  { key: 'muscle_ache', label: 'Muscle / Joint / Body Pain', primaryWord: 'muscle ache', examples: 'Body aches, muscle pain, sore limbs, joint aches' },
  { key: 'sore_throat', label: 'Sore Throat', primaryWord: 'sore throat', examples: 'Throat pain, scratchy throat, throat irritation' },
  { key: 'runny_nose', label: 'Runny Nose / Sniffling', primaryWord: 'runny nose', examples: 'Runny nose, sniffling, nasal discharge' },
  { key: 'congestion', label: 'Nasal Congestion', primaryWord: 'congestion', examples: 'Stuffy nose, blocked sinus, sinus pressure' },
  { key: 'sneezing', label: 'Sneezing', primaryWord: 'sneezing', examples: 'Sneeze fits, sneezing' },
  { key: 'burning_urination', label: 'Burning Urination', primaryWord: 'burning urination', examples: 'Hurts to pee, burning urination, painful pee, dysuria' },
  { key: 'frequent_urination', label: 'Frequent Urination', primaryWord: 'frequent urination', examples: 'Peeing a lot, urinating often, frequent peeing' },
  { key: 'chest_pain', label: 'Chest Pain', primaryWord: 'chest pain', examples: 'Chest tightness, pain in chest, heart pain' },
  { key: 'dizziness', label: 'Dizziness / Vertigo', primaryWord: 'dizziness', examples: 'Lightheaded, dizzy, spinning head, vertigo' },
  { key: 'loss_taste_smell', label: 'Loss of Taste/Smell', primaryWord: 'loss of taste and smell', examples: 'Cannot taste, cannot smell, anosmia' },
  { key: 'wheezing', label: 'Wheezing', primaryWord: 'wheezing', examples: 'Whistling breath, wheeze' },
  { key: 'back_pain', label: 'Back Pain', primaryWord: 'back pain', examples: 'Backache, lower back pain, lumbar pain' }
];

export default function SymptomInput({ onAnalyze, isLoading }: SymptomInputProps) {
  const [text, setText] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDictionary, setShowDictionary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setValidationError("Please enter a valid Patient Age between 1 and 120.");
      return;
    }

    if (!gender) {
      setValidationError("Please specify Patient Gender (Male, Female, or Other).");
      return;
    }

    if (!text.trim()) {
      setValidationError("Please write an description of how you are feeling.");
      return;
    }

    if (isLoading) return;
    onAnalyze(text, parsedAge, gender);
  };

  const selectExample = (ex: string) => {
    if (isLoading) return;
    setText(ex);
  };

  const handleAppendSymptom = (primaryWord: string) => {
    setText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return `I have ${primaryWord.toLowerCase()}.`;
      }
      if (/[.!?]$/.test(trimmed)) {
        return `${trimmed} I also have ${primaryWord.toLowerCase()}.`;
      } else {
        return `${trimmed}, and I also have ${primaryWord.toLowerCase()}.`;
      }
    });
  };

  const filteredSymptoms = SUPPORTED_SYMPTOMS.filter(sym => 
    sym.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sym.examples.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="symptom-input-panel" className="bg-white rounded-3xl border-2 border-slate-150 shadow-lg overflow-hidden animate-fade-in p-8 md:p-10 text-left">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight leading-tight">Describe How You Feel</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Type in your natural plain words. No rigid drop-downs or code selection needed.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User demographics collect segment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border-2 border-slate-150 animate-fade-in">
          <div className="space-y-2 text-left">
            <label htmlFor="patient-age-input" className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              <span>Patient Age (1 - 120 Years) *</span>
            </label>
            <input
              id="patient-age-input"
              type="number"
              min="1"
              max="120"
              required
              disabled={isLoading}
              placeholder="e.g. 28"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setValidationError(null);
              }}
              className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-500 text-slate-800 transition-colors shadow-inner"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              <span>Patient Gender Assigned *</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  id={`gender-${g.toLowerCase()}-btn`}
                  key={g}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setGender(g);
                    setValidationError(null);
                  }}
                  className={`py-4 text-xs font-black uppercase tracking-wider rounded-2xl border-2 transition-all cursor-pointer text-center ${
                    gender === g
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50/30'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {validationError && (
          <div id="demographics-validation-error" className="p-4 bg-red-50 border-2 border-red-105 rounded-2xl text-xs font-bold text-red-800 flex items-center gap-2.5 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>{validationError}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            id="symptom-textarea"
            className="w-full h-56 p-6 border-2 border-slate-200 rounded-3xl text-lg font-semibold text-slate-800 bg-white shadow-inner focus:outline-none focus:border-blue-500 focus:ring-0 leading-relaxed placeholder:text-slate-300 resize-none transition-colors"
            placeholder="Example: I have been feeling hot for three days and my body aches with chills..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
          />
          <div className="absolute bottom-4 right-4 text-xs font-mono font-bold text-slate-400 bg-slate-50/80 px-2 py-1 rounded-md border border-slate-250/20">
            {text.length} characters
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Or Try a Live Patient Description:</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LIVE_EXAMPLES.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectExample(ex)}
                disabled={isLoading}
                className="text-left py-3 px-4 border-2 border-slate-150 hover:border-blue-500 hover:bg-blue-50/30 rounded-2xl text-xs text-slate-700 hover:text-blue-900 font-bold leading-normal cursor-pointer transition-all active:scale-[0.98] shadow-sm bg-slate-50/40"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Supported Symptoms Helper */}
        <div className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
          <button
            type="button"
            onClick={() => setShowDictionary(!showDictionary)}
            className="w-full px-5 py-4 flex justify-between items-center bg-slate-50 border-b border-transparent hover:bg-slate-100 transition-colors select-none text-left"
          >
            <div className="flex items-center gap-2 text-slate-705">
              <HelpCircle className="w-4 h-4 text-slate-450 shrink-0" />
              <span className="text-xs font-black uppercase tracking-widest">Symptom Reference Dictionary ({SUPPORTED_SYMPTOMS.length} Recognized Groups)</span>
            </div>
            {showDictionary ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showDictionary && (
            <div className="p-5 space-y-4 animate-fade-in max-h-96 overflow-y-auto">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Our machine learning models are trained on specific clinical groups. Review them below to see common matches, or click any symptom helper badge to automatically add it to your description:
              </p>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Filter recognized symptoms (e.g. fever, pain)..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {filteredSymptoms.map((sym) => (
                  <div key={sym.key} className="p-3 bg-white border border-slate-150 rounded-xl hover:shadow-sm transition-all text-left flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 leading-tight">{sym.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold leading-normal italic">Key phrasings: {sym.examples}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAppendSymptom(sym.primaryWord)}
                      className="p-1 px-2 border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-[10px] font-black uppercase tracking-wider text-blue-600 rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1 bg-white"
                      title="Quick-append to description"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
                {filteredSymptoms.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center col-span-2 py-4">No matching recognized symptoms found for "{searchQuery}".</p>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          id="check-symptoms-btn"
          type="submit"
          disabled={!text.trim() || isLoading}
          className={`w-full py-5 px-6 rounded-2xl font-display font-black uppercase tracking-widest text-base shadow-lg transition-all active:scale-[0.99] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            !text.trim() || isLoading
              ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 shadow-none cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 shadow-blue-100/70'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="border-2 border-white/40 border-t-white rounded-full w-5 h-5 animate-spin"></span>
              <span>Analyzing Description with ML Models...</span>
            </span>
          ) : (
            <span>Check Symptoms</span>
          )}
        </button>

        <div className="mt-8 flex items-center gap-4 p-4.5 bg-blue-50/80 rounded-2xl border-2 border-blue-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-blue-800 leading-relaxed text-left">
            Our AI reads natural patient language to find and predict critical health conditions instantly.
          </p>
        </div>
      </form>
    </div>
  );
}
