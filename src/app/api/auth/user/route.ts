import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const res = await query(
      'SELECT id, username, email, name, points, streak FROM users WHERE id = $1',
      [session.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = res.rows[0];

    // Fetch user goals as well
    const goalsRes = await query('SELECT * FROM user_goals WHERE user_id = $1', [user.id]);
    const goals = goalsRes.rows[0] || {
      target_calories: 2000,
      target_protein: 80,
      target_water: 3000,
      target_workout_minutes: 30,
    };

    return NextResponse.json({ user, goals });
  } catch (error: any) {
    console.error('Fetch user API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
