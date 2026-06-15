import { GoogleGenAI, Type } from '@google/genai';
import { Disease, Recommendation } from '../src/types';
import { getDiseases } from './db';

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Helper to execute Gemini API calls with exponential backoff retries and fallback models
 */
async function generateContentWithRetry(params: any, retries = 3, delayMs = 600): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || String(err);
      const isRetryable = errMsg.includes('503') || 
                          errMsg.includes('UNAVAILABLE') || 
                          errMsg.includes('429') || 
                          errMsg.includes('500') || 
                          errMsg.includes('ResourceExhausted') || 
                          errMsg.includes('high demand') || 
                          errMsg.includes('temporary');
      
      if (attempt >= retries || !isRetryable) {
        if (params.model === 'gemini-3.5-flash') {
          console.warn(`Gemini 3.5 Flash failed after ${attempt} attempts with error: ${errMsg}. Trying fallback model gemini-3.1-flash-lite...`);
          try {
            const fallbackParams = { ...params, model: 'gemini-3.1-flash-lite' };
            return await ai.models.generateContent(fallbackParams);
          } catch (fallbackErr: any) {
            console.error('Fallback model gemini-3.1-flash-lite also failed:', fallbackErr);
            throw err;
          }
        }
        throw err;
      }
      
      const sleepTime = delayMs * Math.pow(2, attempt - 1);
      console.warn(`Gemini API error (attempt ${attempt}/${retries}): ${errMsg}. Retrying in ${sleepTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }
}

// Dictionary matching colloquial symptom variations to our standardized symptom keys
export const SYMPTOM_DICTIONARY: Record<string, string[]> = {
  fever: ['fever', 'feeling hot', 'high temperature', 'feverish', 'hot body', 'increased temperature', 'pyrexia', 'warmth', 'high temp'],
  headache: ['headache', 'head ache', 'migraine', 'head pain', 'throbbing head', 'throbbing headache', 'pain in head', 'cephalalgia'],
  stomach_pain: ['stomach pain', 'belly pain', 'abdominal pain', 'belly ache', 'stomach ache', 'abdo pain', 'stomach cramps', 'abdominal cramps', 'gut hurt', 'tummy ache', 'cramps'],
  fatigue: ['fatigue', 'weakness', 'body weak', 'feeling weak', 'tired', 'tiredness', 'exhausted', 'exhaustion', 'loss of energy', 'lethargy', 'weary', 'low energy'],
  cough: ['cough', 'coughing', 'dry cough', 'coughing fit', 'coughing fits', 'throat phlegm', 'cough with mucus'],
  vomiting: ['vomiting', 'throwing up', 'vomited', 'throw up', 'puke', 'puking', 'vomited'],
  nausea: ['nausea', 'feeling sick', 'nauseous', 'queasy', 'sick to my stomach', 'feel like vomiting'],
  diarrhea: ['diarrhea', 'diarrhoea', 'watery stool', 'loose stool', 'runny stomach', 'runny tummy', 'loose motion'],
  shortness_of_breath: ['shortness of breath', 'hard to breathe', 'breathless', 'dyspnea', 'gasping', 'difficulty breathing', 'tight chest'],
  chills: ['chills', 'shivering', 'shiver', 'shaking', 'feeling cold', 'rigors'],
  sweating: ['sweating', 'sweat', 'perspiring', 'perspiration', 'night sweats'],
  muscle_ache: ['muscle ache', 'body ache', 'limb soreness', 'muscle pain', 'myalgia', 'aching body', 'joint pain', 'aches'],
  sore_throat: ['sore throat', 'throat pain', 'scratchy throat', 'throat irritation'],
  runny_nose: ['runny nose', 'sniffling', 'rhinorrhoea', 'nasal discharge', 'watery nose'],
  congestion: ['congestion', 'stuffy nose', 'nasal block', 'blocked nose', 'sinus pressure'],
  sneezing: ['sneezing', 'sneeze', 'sneezed'],
  burning_urination: ['burning sensation during urination', 'burning urination', 'painful urination', 'hurts to pee', 'dysuria', 'burning pee', 'uti pain'],
  frequent_urination: ['frequent urination', 'peeing a lot', 'urinating often', 'frequent peeing'],
  chest_pain: ['chest pain', 'chest tightness', 'heart pain', 'pain in chest'],
  dizziness: ['dizziness', 'lightheaded', 'dizzy', 'spinning head', 'giddy', 'vertigo'],
  loss_taste_smell: ['loss of taste', 'loss of smell', 'cannot taste', 'cannot smell', 'anosmia'],
  wheezing: ['wheezing', 'whistling breath', 'wheeze'],
  back_pain: ['back pain', 'backache', 'lower back pain', 'lumbar pain']
};

/**
 * 1. Hybrid NLP Symptom Extraction
 */
export async function extractSymptoms(text: string): Promise<string[]> {
  const normalizedText = text.toLowerCase().trim();
  const detected = new Set<string>();

  // Deterministic Keyword/Synonym Search
  for (const [key, synonyms] of Object.entries(SYMPTOM_DICTIONARY)) {
    for (const syn of synonyms) {
      if (normalizedText.includes(syn)) {
        detected.add(key);
      }
    }
  }

  // LLM Smart Fallback Extraction using Gemini 3.5 Flash
  try {
    const listKeys = Object.keys(SYMPTOM_DICTIONARY).join(', ');
    const systemPrompt = `You are a medical NLP expert. Your task is to extract human-described symptoms from a text sentence and map them to a list of standard symptom keys.
    The valid standard symptom keys are exactly: [${listKeys}].
    Return ONLY a JSON array of keys that correspond to the symptoms mentioned in the user text. If no symptom matches, return an empty array []. No markdown formatting, just raw JSON.`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: `User sentence: "${text}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: 'A list of standard symptom keys extracted from the text.'
        }
      }
    });

    const llmOutput = response.text ? response.text.trim() : '';
    if (llmOutput) {
      const keys = JSON.parse(llmOutput) as string[];
      for (const k of keys) {
        if (SYMPTOM_DICTIONARY[k]) {
          detected.add(k);
        }
      }
    }
  } catch (err) {
    console.error('LLM Symptom extraction failed, falling back to rule-based:', err);
  }

  return Array.from(detected);
}

/**
 * 2. ML Engine: Naive Bayes Classifier
 */
export function predictNaiveBayes(diseases: Disease[], symptoms: string[]) {
  const result: { diseaseId: string; name: string; probability: number }[] = [];
  const logProbabilities: Record<string, number> = {};

  // For each disease, compute logarithmic conditional probability
  // P(Disease | Symptoms) propto P(Disease) * Prod P(s_i | Disease)
  for (const disease of diseases) {
    let logProb = Math.log(1.0 / diseases.length); // Assume uniform prior probability P(Disease)

    // Check every standard symptom key
    for (const sKey of Object.keys(SYMPTOM_DICTIONARY)) {
      const isAssociated = disease.symptoms.includes(sKey);
      const isUserReporting = symptoms.includes(sKey);

      // Simple estimated conditional probability with Laplace smoothing
      // If symptom is associated with the disease, P(s_i | Disease) is high (0.85). If not, P(s_i | Disease) is low (0.05).
      let condProb = 0.05;
      if (isAssociated) {
        condProb = 0.85;
      }

      if (isUserReporting) {
        logProb += Math.log(condProb);
      } else {
        logProb += Math.log(1.0 - condProb);
      }
    }
    logProbabilities[disease.id] = logProb;
  }

  // Convert log probabilities back to regular probabilities (using soft max or standard exponents)
  const maxLog = Math.max(...Object.values(logProbabilities));
  let sumExp = 0;
  const exponents: Record<string, number> = {};
  for (const d of diseases) {
    const exp = Math.exp(logProbabilities[d.id] - maxLog);
    exponents[d.id] = exp;
    sumExp += exp;
  }

  for (const d of diseases) {
    const prob = (exponents[d.id] / sumExp) * 100;
    result.push({ diseaseId: d.id, name: d.name, probability: Math.round(prob) });
  }

  return result.sort((a, b) => b.probability - a.probability);
}

/**
 * 3. ML Engine: Decision Tree Classifier
 */
export function predictDecisionTree(diseases: Disease[], symptoms: string[]) {
  // Simulates a structured classification tree by computing clinical split metrics
  // Best match checks the overlap of symptoms, emphasizing critical symptoms (e.g. unique indicators)
  const predictions: { diseaseId: string; name: string; score: number }[] = [];

  for (const disease of diseases) {
    const matchingCount = disease.symptoms.filter(s => symptoms.includes(s)).length;
    const diseaseSymptomTotal = disease.symptoms.length;
    const userSymptomTotal = symptoms.length;

    // Score based on Jaccard similarity coefficient (and clinical weighting)
    // Jaccard similarity is standard for medical diagnostic binary matrices
    let score = 0;
    if (diseaseSymptomTotal > 0 || userSymptomTotal > 0) {
      const unionCount = new Set([...disease.symptoms, ...symptoms]).size;
      score = (matchingCount / unionCount) * 100;
    }

    predictions.push({ diseaseId: disease.id, name: disease.name, score: Math.round(score) });
  }

  return predictions.sort((a, b) => b.score - a.score);
}

/**
 * 4. ML Engine: Random Forest Classifier
 * Implements an ensemble of randomized trees where each tree randomly samples 65% of features (symptoms)
 */
export function predictRandomForest(diseases: Disease[], symptoms: string[]) {
  const NUM_TREES = 5;
  const votes: Record<string, number> = {};

  for (const disease of diseases) {
    votes[disease.id] = 0;
  }

  for (let i = 0; i < NUM_TREES; i++) {
    // Generate a random subset of symptoms representing this tree's bootsrapped feature focus
    const allSymptomKeys = Object.keys(SYMPTOM_DICTIONARY);
    const subsetSize = Math.floor(allSymptomKeys.length * 0.65);
    const sampledFeatures = new Set<string>();
    while (sampledFeatures.size < subsetSize) {
      const randomIndex = Math.floor(Math.random() * allSymptomKeys.length);
      sampledFeatures.add(allSymptomKeys[randomIndex]);
    }

    // Evaluate Jaccard similarity for this tree restricted to the sampled symptoms
    let bestMatchId = '';
    let highestJaccard = -1;

    for (const disease of diseases) {
      const diseaseSymptomsRestricted = disease.symptoms.filter(s => sampledFeatures.has(s));
      const userSymptomsRestricted = symptoms.filter(s => sampledFeatures.has(s));

      const matching = diseaseSymptomsRestricted.filter(s => userSymptomsRestricted.includes(s)).length;
      const unionSize = new Set([...diseaseSymptomsRestricted, ...userSymptomsRestricted]).size;

      const jaccard = unionSize > 0 ? matching / unionSize : 0;
      if (jaccard > highestJaccard) {
        highestJaccard = jaccard;
        bestMatchId = disease.id;
      }
    }

    if (bestMatchId && highestJaccard > 0) {
      votes[bestMatchId] = (votes[bestMatchId] || 0) + 1;
    }
  }

  const result = Object.entries(votes).map(([diseaseId, count]) => {
    const d = diseases.find(dis => dis.id === diseaseId);
    return {
      diseaseId,
      name: d ? d.name : 'Unknown',
      probability: Math.round((count / NUM_TREES) * 100)
    };
  });

  return result.sort((a, b) => b.probability - a.probability);
}

/**
 * 5. Ensemble Pipeline
 * Combines Naive Bayes probabilities, Decision Tree certainty scores, and Random Forest vote distributions.
 */
export interface MLPrediction {
  diseaseName: string;
  probability: number;
  explanation: string;
  recommendations: Recommendation;
}

export function applyRuleBasedRecommendations(
  predictedDisease: string,
  age: number,
  gender: string,
  symptoms: string[],
  baseRecs: Recommendation
): Recommendation {
  const homeCare = [...baseRecs.homeCare];
  const medicalAdvice = [...baseRecs.medicalAdvice];
  let emergencyWarning = baseRecs.emergencyWarning || '';

  // 1. Determine severity level of symptoms programmatically
  const hasCriticalSymptoms = symptoms.includes('shortness_of_breath') || symptoms.includes('chest_pain') || symptoms.includes('wheezing');
  const hasModerateSymptoms = symptoms.includes('fever') || symptoms.includes('vomiting') || symptoms.includes('diarrhea') || symptoms.includes('dizziness');

  const severity = hasCriticalSymptoms ? 'HIGH' : (hasModerateSymptoms ? 'MODERATE' : 'LOW');

  // 2. Personalize Home Care & Next steps based on user age group
  const isChild = age < 18;
  const isSenior = age >= 65;

  if (isChild) {
    if (!homeCare.some(h => h.toLowerCase().includes('pediatric') || h.toLowerCase().includes('child') || h.toLowerCase().includes('dosing'))) {
      homeCare.unshift("Ensure all supportive measures or OTC medications are strictly pediatric-approved formulations with parent/guardian dosing supervision.");
    }
    if (!medicalAdvice.some(m => m.toLowerCase().includes('pediatrician') || m.toLowerCase().includes('child'))) {
      medicalAdvice.unshift("Consult a board-certified pediatrician or pediatric ward nurse clinician immediately for medical evaluation.");
    }
    if (severity === 'HIGH' || severity === 'MODERATE') {
      emergencyWarning = `[Child Vulnerability warning] ${emergencyWarning || 'Seek prompt attention.'} Children deteriorate rapidly with high fever, vomiting/dehydration, or respiratory distress. Please consult emergency care.`;
    }
  } else if (isSenior) {
    if (!homeCare.some(h => h.toLowerCase().includes('senior') || h.toLowerCase().includes('elder') || h.toLowerCase().includes('mobility') || h.toLowerCase().includes('fall'))) {
      homeCare.unshift("Secure supportive pathways at home to prevent structural falls due to physical weakness, and monitor dynamic liquid intake and core warmth.");
    }
    if (!medicalAdvice.some(m => m.toLowerCase().includes('geriatric') || m.toLowerCase().includes('interaction') || m.toLowerCase().includes('profile'))) {
      medicalAdvice.unshift("A clinical professional should audit your current chronic pharmaceutical medication logs to prevent hazardous drug-drug interactions.");
    }
    if (severity === 'HIGH' || severity === 'MODERATE') {
      emergencyWarning = `[Elderly Risk Alert] ${emergencyWarning || 'Seek urgent diagnostic workups.'} Seniors have reduced physiological reserves. Sub-typical fever readings can mask severe deep infections; prompt medical intervention is highly recommended.`;
    }
  } else {
    if (!homeCare.some(h => h.toLowerCase().includes('rest') || h.toLowerCase().includes('sick'))) {
      homeCare.push("Enforce mental and physical rest periods, and schedule brief work exemption leave backings if intense muscle fatigue is observed.");
    }
  }

  // 3. Gender-specific disease triggered recommendations
  const diseaseLower = predictedDisease.toLowerCase();
  const isFemale = gender.toLowerCase() === 'female';
  const isMale = gender.toLowerCase() === 'male';

  if (diseaseLower.includes('urinary tract') || diseaseLower.includes('uti') || symptoms.includes('burning_urination')) {
    if (isFemale) {
      if (!homeCare.some(h => h.toLowerCase().includes('wipe') || h.toLowerCase().includes('cranberry'))) {
        homeCare.push("Wipe strictly front-to-back post-urination to prevent reinfection, and consider clean unsweetened cranberry fluids to balance tract flow.");
      }
      if (!medicalAdvice.some(m => m.toLowerCase().includes('gynecologist') || m.toLowerCase().includes('pelvic'))) {
        medicalAdvice.push("Consult a gynecologist or women's health nurse if recurring burning urination episodes occur.");
      }
    } else if (isMale) {
      if (!medicalAdvice.some(m => m.toLowerCase().includes('prostate') || m.toLowerCase().includes('bph'))) {
        medicalAdvice.unshift("Male urinary infections are uncommon and require special medical prostate screening or urogenital diagnostic screening to rule out benign prostatic hyperplasia (BPH) or local blockages.");
      }
    }
  }

  if (isFemale && (diseaseLower.includes('covid-19') || diseaseLower.includes('flu') || diseaseLower.includes('malaria') || diseaseLower.includes('pneumonia'))) {
    if (!medicalAdvice.some(m => m.toLowerCase().includes('gestational') || m.toLowerCase().includes('pregnancy'))) {
      medicalAdvice.push("If there is any possibility of pregnancy, ensure immediate notification of your clinical advisor, as severe illness demands careful obstetric medication selections.");
    }
  }

  // 4. Force high-level warning if severity is high
  if (severity === 'HIGH') {
    emergencyWarning = `[CRITICAL EMERGENCY WARNING] High-risk breathing or chest tightness signals demand instant medical team inspection. Please call local paramedics (911/ER) or proceed to the nearest emergency room immediately.`;
  }

  return {
    homeCare: homeCare.slice(0, 4),
    medicalAdvice: medicalAdvice.slice(0, 3),
    emergencyWarning
  };
}

export async function runPredictiveEnsemble(symptoms: string[], originalText: string, age?: number, gender?: string): Promise<MLPrediction[]> {
  const diseases = await getDiseases();

  if (symptoms.length === 0) {
    return [];
  }

  // Get individually modeled distributions
  const nbRaw = predictNaiveBayes(diseases, symptoms);
  const dtRaw = predictDecisionTree(diseases, symptoms);
  const rfRaw = predictRandomForest(diseases, symptoms);

  // Blend distributions
  const ensembleScores: Record<string, number> = {};
  for (const d of diseases) {
    const nbScore = nbRaw.find(x => x.diseaseId === d.id)?.probability || 0;
    const dtScore = dtRaw.find(x => x.diseaseId === d.id)?.score || 0;
    const rfScore = rfRaw.find(x => x.diseaseId === d.id)?.probability || 0;

    // Weight allocations: 40% Naive Bayes, 30% Decision Tree, 30% Random Forest Jaccard voting
    const finalScore = Math.round(0.4 * nbScore + 0.3 * dtScore + 0.3 * rfScore);
    ensembleScores[d.id] = finalScore;
  }

  // Rank diseases by blended probability
  const rankedDiseases = diseases
    .map(d => ({
      id: d.id,
      name: d.name,
      probability: ensembleScores[d.id],
      description: d.description
    }))
    .filter(d => d.probability > 10) // Filter out lower correlations to maintain simplicity
    .sort((a, b) => b.probability - a.probability);

  if (rankedDiseases.length === 0) {
    return [];
  }

  // Use the top prediction as the primary candidate to generate the clinical explanations
  const topCandidate = rankedDiseases[0];

  // Request high-quality, empathetic AI explanation & lifestyle recommendation from Gemini
  let aiExplanation = '';
  let finalRecommendations: Recommendation = {
    homeCare: ['Rest and recover', 'Stay well hydrated with clean fluids', 'Eat light, nutritious meals'],
    medicalAdvice: ['Consult a primary care physician if symptoms persist', 'Monitor body temperature and symptoms'],
    emergencyWarning: 'Seek immediate emergency clinical care if you experience shortness of breath, high persistent fever, extreme weakness, or difficulty waking.'
  };

  try {
    const queryDisease = topCandidate.name;
    const queryConfidence = topCandidate.probability;
    const readableSymptoms = symptoms.map(s => s.replace('_', ' ')).join(', ');
    const patientDemographicsLine = (age && gender) ? `The patient is a ${age}-year-old ${gender.toLowerCase()}.` : '';

    const explanationPrompt = `You are an expert supportive medical assistant. 
    The intelligent Machine Learning algorithm has predicted a ${queryConfidence}% probability that the user may be suffering from: ${queryDisease}.
    The user's reported symptoms are: [${readableSymptoms}].
    The user described how they felt as: "${originalText}".
    ${patientDemographicsLine}

    Tasks:
    1. Provide a patient-friendly clinical explanation of why these symptoms link to ${queryDisease}, customized appropriately for their demographic profile if given. Avoid dense technical jargon. Keep it brief, supportive, and extremely clear.
    2. Provide 3 specific, actionable Home Care tips.
    3. Provide 2 targeted Medical Advice or screening diagnostics (e.g., blood tests, urine screens, visual analysis).
    4. Provide a clear Emergency Warning alert message for warning flags (such as high breathing struggle, severe persistent dehydration). This should be a direct, short emergency warning.

    Your response must be in JSON format under the keys "explanation", "homeCare" (array of strings), "medicalAdvice" (array of strings), and "emergencyWarning" (string). Do not output markdown, return raw JSON.`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: explanationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            homeCare: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            medicalAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            emergencyWarning: { type: Type.STRING }
          },
          required: ['explanation', 'homeCare', 'medicalAdvice']
        }
      }
    });

    const parsed = JSON.parse(response.text ? response.text.trim() : '{}');
    if (parsed.explanation) aiExplanation = parsed.explanation;
    if (parsed.homeCare) finalRecommendations.homeCare = parsed.homeCare;
    if (parsed.medicalAdvice) finalRecommendations.medicalAdvice = parsed.medicalAdvice;
    if (parsed.emergencyWarning) finalRecommendations.emergencyWarning = parsed.emergencyWarning;

  } catch (err) {
    console.error('Failed to generate Gemini clinical explanation, using default template:', err);
    aiExplanation = `Predictive models identified malaria/common illness symptoms such as ${symptoms.join(', ')}. Standard protocol suggests primary checkups.`;
  }

  // Apply deterministic, rule-based clinical health recommendations based on demographic constraints
  if (age !== undefined && gender !== undefined) {
    finalRecommendations = applyRuleBasedRecommendations(topCandidate.name, age, gender, symptoms, finalRecommendations);
  }

  // Return a sorted list of predictions where the top prediction is enriched with our clinical recommendations
  return rankedDiseases.map((r, index) => {
    return {
      diseaseName: r.name,
      probability: r.probability,
      explanation: index === 0 ? aiExplanation : `Alternative diagnosed candidate with ${r.probability}% probability match.`,
      recommendations: index === 0 ? finalRecommendations : { homeCare: [], medicalAdvice: [] }
    };
  });
}
