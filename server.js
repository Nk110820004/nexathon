const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// PostgreSQL Client
let pool = null;
const usePostgres = process.env.DATABASE_URL || process.env.PGHOST;
if (usePostgres) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    console.log('[WebSocket Server] PostgreSQL Pool initialized.');
  } catch (err) {
    console.error('[WebSocket Server] PostgreSQL initialization failed:', err);
  }
}

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'db_fallback.json');

// Helper to read fallback DB
function readFallbackDB() {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      const defaultSchema = { users: [], user_goals: [], chat_messages: [], food_logs: [], workout_logs: [], water_logs: [], coupons: [] };
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(defaultSchema, null, 2), 'utf-8');
      return defaultSchema;
    }
    return JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'));
  } catch (err) {
    return { users: [], user_goals: [], chat_messages: [], food_logs: [], workout_logs: [], water_logs: [], coupons: [] };
  }
}

// Helper to write fallback DB
function writeFallbackDB(data) {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {}
}

// Helper to save message and update points in DB
async function saveMessageAndCalculatePoints(username, message) {
  // 1. Calculate points
  const appreciativeWords = ['thanks', 'thank you', 'appreciate', 'grateful', 'awesome', 'great', 'excellent'];
  let pointsEarned = 0;
  for (const word of appreciativeWords) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = message.match(regex);
    if (matches) {
      pointsEarned += matches.length;
    }
  }

  let finalPoints = 0;

  if (pool) {
    try {
      // Save message
      await pool.query('INSERT INTO chat_messages (username, message) VALUES ($1, $2)', [username, message]);
      
      if (pointsEarned > 0) {
        // Update user points
        const updateRes = await pool.query('UPDATE users SET points = points + $1 WHERE username = $2 RETURNING points', [pointsEarned, username]);
        if (updateRes.rows.length > 0) {
          finalPoints = updateRes.rows[0].points;
        }
      } else {
        const userRes = await pool.query('SELECT points FROM users WHERE username = $1', [username]);
        if (userRes.rows.length > 0) {
          finalPoints = userRes.rows[0].points;
        }
      }
      return { pointsEarned, finalPoints };
    } catch (err) {
      console.error('[WebSocket Server] DB Error, running local fallback logic:', err);
    }
  }

  // Fallback DB
  const db = readFallbackDB();
  
  // Save message
  db.chat_messages.push({
    id: db.chat_messages.length + 1,
    username,
    message,
    created_at: new Date().toISOString()
  });

  // Find user and update points
  const userIdx = db.users.findIndex(u => u.username === username);
  if (userIdx !== -1) {
    if (pointsEarned > 0) {
      db.users[userIdx].points = (db.users[userIdx].points || 0) + pointsEarned;
    }
    finalPoints = db.users[userIdx].points;
  }
  writeFallbackDB(db);

  return { pointsEarned, finalPoints };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.io initialization
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join', (username) => {
      socket.username = username;
      console.log(`${username} joined the chat`);
    });

    socket.on('message', async (data) => {
      const username = socket.username || data.username || 'Anonymous';
      const messageText = data.text || data;
      
      console.log(`[WebSocket Message] ${username}: ${messageText}`);

      // Save to database & update points
      const { pointsEarned, finalPoints } = await saveMessageAndCalculatePoints(username, messageText);

      // Broadcast message to all clients
      const messagePayload = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        username,
        message: messageText,
        created_at: new Date().toISOString(),
        pointsEarned,
        finalPoints
      };

      io.emit('message', messagePayload);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (${socket.username || 'unknown'})`);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
