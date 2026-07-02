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
      'SELECT * FROM water_logs WHERE user_id = $1 AND log_date = $2 ORDER BY created_at ASC',
      [session.id, date]
    );

    return NextResponse.json({ logs: logsRes.rows });
  } catch (error: any) {
    console.error('Fetch water logs error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { amount_ml, date } = await request.json();

    if (!amount_ml) {
      return NextResponse.json({ error: 'Amount of water is required.' }, { status: 400 });
    }

    const logDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      'INSERT INTO water_logs (user_id, amount_ml, log_date) VALUES ($1, $2, $3) RETURNING *',
      [session.id, parseInt(amount_ml), logDate]
    );

    return NextResponse.json({ log: result.rows[0] });
  } catch (error: any) {
    console.error('Add water log error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
