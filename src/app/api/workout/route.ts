import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const workoutsRes = await query(
      'SELECT * FROM workout_logs WHERE user_id = $1 ORDER BY log_date DESC, id DESC',
      [session.id]
    );

    return NextResponse.json({ workouts: workoutsRes.rows });
  } catch (error: any) {
    console.error('Fetch workouts error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { exercise_name, reps, duration_seconds, accuracy_score, date } = await request.json();

    if (!exercise_name) {
      return NextResponse.json({ error: 'Exercise name is required.' }, { status: 400 });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      'INSERT INTO workout_logs (user_id, exercise_name, reps, duration_seconds, accuracy_score, log_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        session.id,
        exercise_name,
        parseInt(reps || 0),
        parseInt(duration_seconds || 0),
        parseInt(accuracy_score || 100),
        logDate,
      ]
    );

    // Award user points for completing a workout!
    // 5 points per 10 reps, or 10 points per completed minute. Let's calculate:
    const calculatedPoints = Math.max(10, Math.floor((reps || 0) * 0.5) + Math.floor((duration_seconds || 0) / 10));
    await query('UPDATE users SET points = points + $1 WHERE id = $2', [calculatedPoints, session.id]);

    return NextResponse.json({ workout: result.rows[0], pointsAwarded: calculatedPoints });
  } catch (error: any) {
    console.error('Add workout log error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
