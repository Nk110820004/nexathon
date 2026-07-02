import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const messagesRes = await query(
      'SELECT id, username, message, created_at FROM chat_messages ORDER BY created_at ASC LIMIT 100'
    );

    return NextResponse.json({ messages: messagesRes.rows });
  } catch (error: any) {
    console.error('Fetch chat history error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
