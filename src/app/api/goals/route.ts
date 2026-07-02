import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { target_calories, target_protein, target_water, target_workout_minutes } = await request.json();

    const calories = parseInt(target_calories) || 2000;
    const protein = parseInt(target_protein) || 80;
    const water = parseInt(target_water) || 3000;
    const workout_mins = parseInt(target_workout_minutes) || 30;

    // Check if user already has a goal record
    const existing = await query('SELECT id FROM user_goals WHERE user_id = $1', [session.id]);
    
    let result;
    if (existing.rows.length > 0) {
      result = await query(
        'UPDATE user_goals SET target_calories = $1, target_protein = $2, target_water = $3, target_workout_minutes = $4 WHERE user_id = $5 RETURNING *',
        [calories, protein, water, workout_mins, session.id]
      );
    } else {
      result = await query(
        'INSERT INTO user_goals (user_id, target_calories, target_protein, target_water, target_workout_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [session.id, calories, protein, water, workout_mins]
      );
    }

    return NextResponse.json({ goals: result.rows[0] });
  } catch (error: any) {
    console.error('Update goals error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
