import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const logsRes = await query(
      'SELECT * FROM food_logs WHERE user_id = $1 AND log_date = $2 ORDER BY id ASC',
      [session.id, date]
    );

    return NextResponse.json({ logs: logsRes.rows });
  } catch (error: any) {
    console.error('Fetch food logs error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { food_name, calories, protein, carbs, fats, quantity, date } = await request.json();

    if (!food_name || !calories || !protein || !quantity) {
      return NextResponse.json({ error: 'Food name, calories, protein, and quantity are required.' }, { status: 400 });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      'INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fats, quantity, log_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        session.id,
        food_name,
        parseInt(calories),
        parseInt(protein),
        parseInt(carbs || 0),
        parseInt(fats || 0),
        parseInt(quantity),
        logDate,
      ]
    );

    return NextResponse.json({ log: result.rows[0] });
  } catch (error: any) {
    console.error('Add food log error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
