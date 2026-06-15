import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { User, Disease, Prediction } from '../src/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Helper to hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initial clinical dataset
const DEFAULT_DISEASES: Disease[] = [
  {
    id: 'd1',
    name: 'Malaria',
    description: 'A life-threatening disease caused by parasites transmitted to people through the bites of infected female Anopheles mosquitoes.',
    symptoms: ['fever', 'headache', 'chills', 'sweating', 'muscle_ache', 'nausea', 'fatigue']
  },
  {
    id: 'd2',
    name: 'Typhoid Fever',
    description: 'A bacterial infection caused by Salmonella typhi, usually spread through contaminated food or water.',
    symptoms: ['fever', 'fatigue', 'headache', 'nausea', 'stomach_pain', 'cough', 'diarrhea']
  },
  {
    id: 'd3',
    name: 'Common Cold',
    description: 'A viral infection of your nose and throat (upper respiratory tract). It\'s usually harmless.',
    symptoms: ['runny_nose', 'sneezing', 'sore_throat', 'cough', 'congestion', 'muscle_ache']
  },
  {
    id: 'd4',
    name: 'Influenza (Flu)',
    description: 'A common viral infection that can be deadly, especially in high-risk groups, affecting lungs, nose, and throat.',
    symptoms: ['fever', 'muscle_ache', 'chills', 'fatigue', 'headache', 'cough', 'sore_throat', 'runny_nose']
  },
  {
    id: 'd5',
    name: 'Food Poisoning',
    description: 'Illness caused by food contaminated with bacteria, viruses, parasites, or toxins.',
    symptoms: ['stomach_pain', 'nausea', 'vomiting', 'diarrhea', 'fever', 'fatigue', 'headache']
  },
  {
    id: 'd6',
    name: 'COVID-19',
    description: 'An infectious respiratory illness caused by the SARS-CoV-2 virus, with highly variable symptoms.',
    symptoms: ['cough', 'shortness_of_breath', 'fever', 'chills', 'muscle_ache', 'headache', 'sore_throat', 'loss_taste_smell', 'fatigue']
  },
  {
    id: 'd7',
    name: 'Pneumonia',
    description: 'An infection that inflames the air sacs in one or both lungs, which may fill with fluid or pus.',
    symptoms: ['cough', 'fever', 'sweating', 'chills', 'shortness_of_breath', 'chest_pain', 'fatigue']
  },
  {
    id: 'd8',
    name: 'Urinary Tract Infection (UTI)',
    description: 'An infection in any part of the urinary system, including kidneys, bladder, or urethra.',
    symptoms: ['chest_pain', 'burning_urination', 'frequent_urination', 'back_pain']
  },
  {
    id: 'd9',
    name: 'Migraine',
    description: 'A neurological condition that can cause multiple symptoms, preeminently intense throbbing headaches.',
    symptoms: ['headache', 'nausea', 'dizziness']
  },
  {
    id: 'd10',
    name: 'Dehydration',
    description: 'A harmful reduction in the amount of water in the body, caused by losing more fluid than you take in.',
    symptoms: ['fatigue', 'dizziness', 'stomach_pain']
  },
  {
    id: 'd11',
    name: 'Gastroenteritis',
    description: 'An intestinal infection marked by watery diarrhea, abdominal cramps, nausea or vomiting, and sometimes fever.',
    symptoms: ['diarrhea', 'stomach_pain', 'nausea', 'vomiting', 'fever']
  },
  {
    id: 'd12',
    name: 'Asthma',
    description: 'A condition in which your airways narrow and swell and may produce extra mucus, making breathing difficult.',
    symptoms: ['shortness_of_breath', 'chest_pain', 'wheezing', 'cough']
  }
];

interface schema {
  users: (User & { passwordHash: string })[];
  diseases: Disease[];
  predictions: Prediction[];
}

let dbInstance: schema | null = null;
let writeLock = false;

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function initDb() {
  if (dbInstance) return dbInstance;

  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    if (await exists(DB_FILE)) {
      const raw = await fs.readFile(DB_FILE, 'utf-8');
      dbInstance = JSON.parse(raw);
    } else {
      // Create empty db with default diseases & an admin
      const adminId = 'u_admin';
      const defaultAdmin = {
        id: adminId,
        fullName: 'System Administrator',
        email: 'admin@symptomsage.com',
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword('admin123') // Default password
      };

      dbInstance = {
        users: [defaultAdmin],
        diseases: DEFAULT_DISEASES,
        predictions: []
      };
      await saveDb();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dbInstance = {
      users: [],
      diseases: DEFAULT_DISEASES,
      predictions: []
    };
  }
  return dbInstance;
}

export async function saveDb() {
  if (!dbInstance) return;
  if (writeLock) {
    // Retry shortly if locked
    await new Promise((res) => setTimeout(res, 50));
    return saveDb();
  }

  writeLock = true;
  try {
    const raw = JSON.stringify(dbInstance, null, 2);
    const tempFile = `${DB_FILE}.tmp`;
    await fs.writeFile(tempFile, raw, 'utf-8');
    await fs.rename(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database:', err);
  } finally {
    writeLock = false;
  }
}

// Database helper queries
export async function getUsers() {
  const db = await initDb();
  return db.users;
}

export async function addUser(user: User & { passwordHash: string }) {
  const db = await initDb();
  db.users.push(user);
  await saveDb();
}

export async function removeUser(id: string) {
  const db = await initDb();
  db.users = db.users.filter(u => u.id !== id);
  db.predictions = db.predictions.filter(p => p.userId !== id); // clean up predictions
  await saveDb();
}

export async function getDiseases() {
  const db = await initDb();
  return db.diseases;
}

export async function addDisease(disease: Disease) {
  const db = await initDb();
  db.diseases.push(disease);
  await saveDb();
}

export async function updateDisease(updated: Disease) {
  const db = await initDb();
  db.diseases = db.diseases.map(d => d.id === updated.id ? updated : d);
  await saveDb();
}

export async function removeDisease(id: string) {
  const db = await initDb();
  db.diseases = db.diseases.filter(d => d.id !== id);
  await saveDb();
}

export async function getPredictions() {
  const db = await initDb();
  return db.predictions;
}

export async function addPrediction(prediction: Prediction) {
  const db = await initDb();
  db.predictions.push(prediction);
  await saveDb();
}
