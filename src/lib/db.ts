import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// PostgreSQL connection pool configuration
let pool: Pool | null = null;
const usePostgres = process.env.DATABASE_URL || process.env.PGHOST;

if (usePostgres) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // fallback options if DATABASE_URL is not set but individual options are
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    console.log('PostgreSQL Pool initialized.');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL Pool:', error);
  }
} else {
  console.log('No PostgreSQL configuration found. Operating in mock fallback mode (db_fallback.json).');
}

// Fallback file-based DB setup
const FALLBACK_FILE_PATH = path.join(process.cwd(), 'db_fallback.json');

interface FallbackSchema {
  users: any[];
  user_goals: any[];
  chat_messages: any[];
  food_logs: any[];
  workout_logs: any[];
  water_logs: any[];
  coupons: any[];
}

const defaultSchema: FallbackSchema = {
  users: [],
  user_goals: [],
  chat_messages: [],
  food_logs: [],
  workout_logs: [],
  water_logs: [],
  coupons: [],
};

// Helper to read fallback database file
function readFallbackDB(): FallbackSchema {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(defaultSchema, null, 2), 'utf-8');
      return defaultSchema;
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8');
    return JSON.parse(data) as FallbackSchema;
  } catch (err) {
    console.error('Error reading fallback DB:', err);
    return defaultSchema;
  }
}

// Helper to write fallback database file
function writeFallbackDB(data: FallbackSchema) {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing fallback DB:', err);
  }
}

// Global query helper
export async function query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      return { rows: res.rows };
    } catch (err) {
      console.warn('PostgreSQL query error. Falling back to local file DB.', err);
    }
  }

  // Fallback DB processing: Mock SQL query parsing
  const db = readFallbackDB();
  const lowerText = text.toLowerCase().trim();

  // 1. INSERT INTO users
  if (lowerText.startsWith('insert into users')) {
    // INSERT INTO users (username, password, name, email) VALUES ($1, $2, $3, $4) RETURNING *
    const [username, password, name, email] = params;
    const existing = db.users.find(u => u.email === email || u.username === username);
    if (existing) {
      throw new Error('Duplicate key: user already exists.');
    }
    const newUser = {
      id: db.users.length + 1,
      username,
      password,
      name,
      email,
      points: 0,
      streak: 1,
      last_login: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    // Create default goals for user
    db.user_goals.push({
      id: db.user_goals.length + 1,
      user_id: newUser.id,
      target_calories: 2000,
      target_protein: 80,
      target_water: 3000,
      target_workout_minutes: 30,
    });
    writeFallbackDB(db);
    return { rows: [newUser] };
  }

  // 2. SELECT FROM users (login checking or fetching profile)
  if (lowerText.startsWith('select') && lowerText.includes('from users')) {
    if (lowerText.includes('email =') || lowerText.includes('email=')) {
      const email = params[0];
      const match = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      return { rows: match ? [match] : [] };
    }
    if (lowerText.includes('username =') || lowerText.includes('username=')) {
      const username = params[0];
      const match = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      return { rows: match ? [match] : [] };
    }
    return { rows: db.users };
  }

  // 3. UPDATE users (updating points, streak, last login)
  if (lowerText.startsWith('update users')) {
    if (lowerText.includes('points = points +')) {
      // UPDATE users SET points = points + $1 WHERE username = $2 RETURNING *
      const [pointsAdded, username] = params;
      const userIdx = db.users.findIndex(u => u.username === username);
      if (userIdx !== -1) {
        db.users[userIdx].points = (db.users[userIdx].points || 0) + parseInt(pointsAdded);
        writeFallbackDB(db);
        return { rows: [db.users[userIdx]] };
      }
    } else if (lowerText.includes('points =') && lowerText.includes('streak =')) {
      // UPDATE users SET points = $1, streak = $2, last_login = $3 WHERE id = $4
      const [points, streak, last_login, id] = params;
      const userIdx = db.users.findIndex(u => u.id === id);
      if (userIdx !== -1) {
        db.users[userIdx].points = points;
        db.users[userIdx].streak = streak;
        db.users[userIdx].last_login = last_login;
        writeFallbackDB(db);
        return { rows: [db.users[userIdx]] };
      }
    } else if (lowerText.includes('points =')) {
      // UPDATE users SET points = $1 WHERE id = $2 RETURNING *
      const [points, id] = params;
      const userIdx = db.users.findIndex(u => u.id === id);
      if (userIdx !== -1) {
        db.users[userIdx].points = points;
        writeFallbackDB(db);
        return { rows: [db.users[userIdx]] };
      }
    }
    return { rows: [] };
  }

  // 4. User Goals (GET/UPDATE)
  if (lowerText.includes('from user_goals')) {
    const userId = params[0];
    let goal = db.user_goals.find(g => g.user_id === userId);
    if (!goal) {
      goal = { id: db.user_goals.length + 1, user_id: userId, target_calories: 2000, target_protein: 80, target_water: 3000, target_workout_minutes: 30 };
      db.user_goals.push(goal);
      writeFallbackDB(db);
    }
    return { rows: [goal] };
  }
  if (lowerText.startsWith('insert into user_goals') || lowerText.startsWith('update user_goals')) {
    // INSERT INTO user_goals (user_id, target_calories, target_protein, target_water, target_workout_minutes) VALUES ($1, $2, $3, $4, $5)
    // ON CONFLICT (user_id) DO UPDATE SET target_calories = $2...
    const [userId, calories, protein, water, workout_mins] = params;
    const goalIdx = db.user_goals.findIndex(g => g.user_id === userId);
    const updatedGoal = {
      id: goalIdx !== -1 ? db.user_goals[goalIdx].id : db.user_goals.length + 1,
      user_id: userId,
      target_calories: calories,
      target_protein: protein,
      target_water: water,
      target_workout_minutes: workout_mins,
    };
    if (goalIdx !== -1) {
      db.user_goals[goalIdx] = updatedGoal;
    } else {
      db.user_goals.push(updatedGoal);
    }
    writeFallbackDB(db);
    return { rows: [updatedGoal] };
  }

  // 5. Chat Messages (GET/INSERT)
  if (lowerText.includes('from chat_messages')) {
    // Select last 100 chat messages
    const messages = db.chat_messages.slice(-100);
    return { rows: messages };
  }
  if (lowerText.startsWith('insert into chat_messages')) {
    const [username, message] = params;
    const msg = {
      id: db.chat_messages.length + 1,
      username,
      message,
      created_at: new Date().toISOString(),
    };
    db.chat_messages.push(msg);
    writeFallbackDB(db);
    return { rows: [msg] };
  }

  // 6. Food Logs (GET/INSERT)
  if (lowerText.includes('from food_logs')) {
    // SELECT * FROM food_logs WHERE user_id = $1 AND log_date = $2
    const [userId, logDate] = params;
    const logs = db.food_logs.filter(
      l => l.user_id === userId && l.log_date === logDate
    );
    return { rows: logs };
  }
  if (lowerText.startsWith('insert into food_logs')) {
    // INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fats, quantity, log_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    const [userId, foodName, calories, protein, carbs, fats, quantity, logDate] = params;
    const newLog = {
      id: db.food_logs.length + 1,
      user_id: userId,
      food_name: foodName,
      calories: parseInt(calories),
      protein: parseInt(protein),
      carbs: parseInt(carbs || 0),
      fats: parseInt(fats || 0),
      quantity: parseInt(quantity),
      log_date: logDate,
    };
    db.food_logs.push(newLog);
    writeFallbackDB(db);
    return { rows: [newLog] };
  }

  // 7. Workout Logs (GET/INSERT)
  if (lowerText.includes('from workout_logs')) {
    const [userId] = params;
    const logs = db.workout_logs.filter(w => w.user_id === userId);
    return { rows: logs };
  }
  if (lowerText.startsWith('insert into workout_logs')) {
    // INSERT INTO workout_logs (user_id, exercise_name, reps, duration_seconds, accuracy_score, log_date) VALUES ($1, $2, $3, $4, $5, $6)
    const [userId, exerciseName, reps, durationSeconds, accuracyScore, logDate] = params;
    const newLog = {
      id: db.workout_logs.length + 1,
      user_id: userId,
      exercise_name: exerciseName,
      reps: parseInt(reps),
      duration_seconds: parseInt(durationSeconds),
      accuracy_score: parseInt(accuracyScore),
      log_date: logDate,
    };
    db.workout_logs.push(newLog);
    writeFallbackDB(db);
    return { rows: [newLog] };
  }

  // 8. Water Logs (GET/INSERT)
  if (lowerText.includes('from water_logs')) {
    // SELECT * FROM water_logs WHERE user_id = $1 AND log_date = $2
    const [userId, logDate] = params;
    const logs = db.water_logs.filter(
      w => w.user_id === userId && w.log_date === logDate
    );
    return { rows: logs };
  }
  if (lowerText.startsWith('insert into water_logs')) {
    // INSERT INTO water_logs (user_id, amount_ml, log_date) VALUES ($1, $2, $3)
    const [userId, amountMl, logDate] = params;
    const newLog = {
      id: db.water_logs.length + 1,
      user_id: userId,
      amount_ml: parseInt(amountMl),
      log_date: logDate,
      created_at: new Date().toISOString(),
    };
    db.water_logs.push(newLog);
    writeFallbackDB(db);
    return { rows: [newLog] };
  }

  // 9. Coupons (GET/INSERT)
  if (lowerText.includes('from coupons')) {
    const [userId] = params;
    const list = db.coupons.filter(c => c.user_id === userId);
    return { rows: list };
  }
  if (lowerText.startsWith('insert into coupons')) {
    // INSERT INTO coupons (user_id, code, discount_percentage) VALUES ($1, $2, $3) RETURNING *
    const [userId, code, discountPercentage] = params;
    const newCoupon = {
      id: db.coupons.length + 1,
      user_id: userId,
      code,
      discount_percentage: parseInt(discountPercentage),
      status: 'active',
      claimed_at: new Date().toISOString(),
    };
    db.coupons.push(newCoupon);
    writeFallbackDB(db);
    return { rows: [newCoupon] };
  }

  return { rows: [] };
}
