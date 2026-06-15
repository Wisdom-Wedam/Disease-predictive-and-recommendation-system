import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  initDb, 
  getUsers, 
  addUser, 
  removeUser, 
  getDiseases, 
  addDisease, 
  updateDisease, 
  removeDisease, 
  getPredictions, 
  addPrediction,
  hashPassword 
} from './server/db';
import { extractSymptoms, runPredictiveEnsemble, SYMPTOM_DICTIONARY } from './server/ml';
import { Prediction, User, Disease } from './src/types';
import dotenv from 'dotenv';

dotenv.config();

const port = 3000;

async function startServer() {
  // Always initialize database on startup
  await initDb();

  const app = express();
  app.use(express.json());

  // ================= AUTHENTICATION ENDPOINTS =================

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { fullName, email, password, role } = req.body;
      if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Full name, email and password are required' });
      }

      const users = await getUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const newUser: User = {
        id: `u_${Date.now()}`,
        fullName,
        email: email.toLowerCase(),
        role: role === 'admin' ? 'admin' : 'patient',
        createdAt: new Date().toISOString()
      };

      await addUser({
        ...newUser,
        passwordHash: hashPassword(password)
      });

      res.status(201).json({ user: newUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const users = await getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const { passwordHash, ...userPayload } = user;
      res.json({ user: userPayload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= CLINICAL PREDICTION ENDPOINTS =================

  app.post('/api/predict', async (req, res) => {
    try {
      const { text, userId, age, gender } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Symptom text description is required' });
      }

      // Validate patient demographics inputs
      if (age === undefined || age === null || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
        return res.status(400).json({ error: 'A valid Age between 1 and 120 is required.' });
      }
      if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
        return res.status(400).json({ error: 'Gender (Male, Female, or Other) is required.' });
      }

      const clientAge = Number(age);
      const clientGender = String(gender);

      // Step 1: Detect and clean symptoms automatically
      const symptoms = await extractSymptoms(text);

      if (symptoms.length === 0) {
        return res.json({
          symptoms: [],
          predictions: []
        });
      }

      // Step 2: Run Machine Learning predictive models & AI Explanation
      const predictions = await runPredictiveEnsemble(symptoms, text, clientAge, clientGender);

      // Step 3: Record the prediction history in DB if valid logged-in user
      if (userId && predictions.length > 0) {
        const primaryResult = predictions[0];
        const newRecord: Prediction = {
          id: `pred_${Date.now()}`,
          userId,
          originalText: text,
          extractedSymptoms: symptoms,
          predictedDisease: primaryResult.diseaseName,
          confidenceScore: primaryResult.probability,
          explanation: primaryResult.explanation,
          recommendations: primaryResult.recommendations,
          predictionDate: new Date().toISOString(),
          age: clientAge,
          gender: clientGender
        };
        await addPrediction(newRecord);
      }

      res.json({
        symptoms,
        predictions
      });
    } catch (err: any) {
      console.error('Core predictor endpoint crashed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ================= TRACKING / HISTORY ENDPOINTS =================

  app.get('/api/history', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const allPredictions = await getPredictions();
      const userRecords = allPredictions
        .filter(p => p.userId === userId)
        .sort((a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime());

      res.json(userRecords);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= ADMINISTRATOR STATISTICAL REPORTS =================

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const users = await getUsers();
      const predictions = await getPredictions();

      // Simple metric math
      const totalUsers = users.filter(u => u.role !== 'admin').length;
      const totalPredictions = predictions.length;

      const sumConfidence = predictions.reduce((sum, p) => sum + p.confidenceScore, 0);
      const averageConfidence = totalPredictions > 0 ? Math.round(sumConfidence / totalPredictions) : 0;

      // Disease distribution aggregation
      const diseaseCounts: Record<string, number> = {};
      for (const p of predictions) {
        diseaseCounts[p.predictedDisease] = (diseaseCounts[p.predictedDisease] || 0) + 1;
      }
      const diseaseDistribution = Object.entries(diseaseCounts).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);

      // Prediction trends over last 7 days
      const trendsMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendsMap[dateStr] = 0;
      }

      for (const p of predictions) {
        const dateStr = p.predictionDate.split('T')[0];
        if (trendsMap[dateStr] !== undefined) {
          trendsMap[dateStr] += 1;
        }
      }
      const predictionTrends = Object.entries(trendsMap).map(([date, count]) => ({
        date,
        count
      }));

      // Active patients ranking
      const userMap: Record<string, { name: string; email: string; count: number }> = {};
      for (const p of predictions) {
        if (!userMap[p.userId]) {
          const matchedUser = users.find(u => u.id === p.userId);
          if (matchedUser) {
            userMap[p.userId] = {
              name: matchedUser.fullName,
              email: matchedUser.email,
              count: 0
            };
          }
        }
        if (userMap[p.userId]) {
          userMap[p.userId].count += 1;
        }
      }

      const activeUsers = Object.values(userMap)
        .map(u => ({
          name: u.name,
          email: u.email,
          predictionsCount: u.count
        }))
        .sort((a, b) => b.predictionsCount - a.predictionsCount)
        .slice(0, 5);

      res.json({
        totalUsers,
        totalPredictions,
        averageConfidence,
        diseaseDistribution,
        predictionTrends,
        activeUsers
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= USER OPERATIONS ENDPOINTS =================

  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await getUsers();
      // Remove sensitive hashes
      const scrubbed = users.map(({ passwordHash, ...u }) => u);
      res.json(scrubbed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'u_admin') {
        return res.status(403).json({ error: 'Cannot delete default admin profile' });
      }
      await removeUser(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= CLINICAL DATASET CONTROL ENDPOINTS =================

  app.get('/api/admin/diseases', async (req, res) => {
    try {
      const diseases = await getDiseases();
      res.json(diseases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/diseases', async (req, res) => {
    try {
      const { name, description, symptoms } = req.body;
      if (!name || !description || !Array.isArray(symptoms)) {
        return res.status(400).json({ error: 'Name, description and valid symptoms array are required' });
      }

      const newDisease: Disease = {
        id: `d_${Date.now()}`,
        name,
        description,
        symptoms
      };

      await addDisease(newDisease);
      res.status(201).json(newDisease);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/diseases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, symptoms } = req.body;
      if (!name || !description || !Array.isArray(symptoms)) {
        return res.status(400).json({ error: 'Name, description and valid symptoms list are required' });
      }

      const updated: Disease = {
        id,
        name,
        description,
        symptoms
      };

      await updateDisease(updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/diseases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await removeDisease(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= EXPOSE CONSTANT SYMPTOM KEYS =================
  app.get('/api/symptoms-dictionary', (req, res) => {
    res.json(Object.keys(SYMPTOM_DICTIONARY));
  });

  // ================= INTEGRATED VITE SERVING ARCHITECTURE =================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SymptomSage backend server online at http://0.0.0.0:${port}`);
  });
}

startServer();
