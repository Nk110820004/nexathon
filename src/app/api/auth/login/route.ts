import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Find user
    const res = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = res.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Calculate/update login streak
    const todayStr = new Date().toISOString().split('T')[0];
    const lastLoginStr = user.last_login ? new Date(user.last_login).toISOString().split('T')[0] : '';
    
    let newStreak = user.streak || 1;
    let points = user.points || 0;

    if (lastLoginStr) {
      const today = new Date(todayStr);
      const lastLogin = new Date(lastLoginStr);
      const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Logged in exactly consecutive day!
        newStreak += 1;
        points += 10; // Award 10 points for consecutive check-in!
      } else if (diffDays > 1) {
        // Missed a day, reset streak
        newStreak = 1;
      }
      // If diffDays === 0 (same day), streak remains the same
    }

    // Update database user metrics
    await query(
      'UPDATE users SET points = $1, streak = $2, last_login = $3 WHERE id = $4',
      [points, newStreak, todayStr, user.id]
    );

    // Encrypt session
    const sessionToken = encryptSession({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
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

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        points: points,
        streak: newStreak,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
