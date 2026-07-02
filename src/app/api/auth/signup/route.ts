import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, email, password, name } = await request.json();

    if (!username || !email || !password || !name) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Username or email already registered.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const insertRes = await query(
      'INSERT INTO users (username, password, name, email) VALUES ($1, $2, $3, $4) RETURNING id, username, email, name, points, streak',
      [username, hashedPassword, name, email]
    );

    const newUser = insertRes.rows[0];

    // Encrypt session
    const sessionToken = encryptSession({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
