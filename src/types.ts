export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'patient' | 'admin';
  createdAt: string;
}

export interface Disease {
  id: string;
  name: string;
  description: string;
  symptoms: string[]; // List of standardized symptom keys associated with this disease
}

export interface Prediction {
  id: string;
  userId: string;
  originalText: string;
  extractedSymptoms: string[];
  predictedDisease: string;
  confidenceScore: number; // 0 to 100
  explanation: string;
  predictionDate: string;
  recommendations: Recommendation;
  age?: number;
  gender?: string;
}

export interface Recommendation {
  homeCare: string[];
  medicalAdvice: string[];
  emergencyWarning?: string;
}

export interface SystemStats {
  totalUsers: number;
  totalPredictions: number;
  averageConfidence: number;
  diseaseDistribution: { name: string; value: number }[];
  predictionTrends: { date: string; count: number }[];
  activeUsers: { name: string; email: string; predictionsCount: number }[];
}
