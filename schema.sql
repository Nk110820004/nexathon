-- PostgreSQL Database Schema for PoseParfaite & Healthyfy App

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    points INT DEFAULT 0,
    streak INT DEFAULT 1,
    last_login DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Goals Table
CREATE TABLE IF NOT EXISTS user_goals (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_calories INT DEFAULT 2000,
    target_protein INT DEFAULT 80, -- in grams
    target_water INT DEFAULT 3000, -- in ml
    target_workout_minutes INT DEFAULT 30
);

-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Food Logs Table
CREATE TABLE IF NOT EXISTS food_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_name VARCHAR(100) NOT NULL,
    calories INT NOT NULL,
    protein INT NOT NULL, -- in grams
    carbs INT DEFAULT 0,
    fats INT DEFAULT 0,
    quantity INT NOT NULL, -- multiplier / portion count
    log_date DATE DEFAULT CURRENT_DATE
);

-- 5. Workout Logs Table
CREATE TABLE IF NOT EXISTS workout_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL, -- e.g., 'Bicep Curls', 'Squats'
    reps INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    accuracy_score INT DEFAULT 100, -- percentage (0-100)
    log_date DATE DEFAULT CURRENT_DATE
);

-- 6. Water Logs Table
CREATE TABLE IF NOT EXISTS water_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_ml INT NOT NULL,
    log_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'redeemed', 'expired'
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
