import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const couponsRes = await query(
      'SELECT * FROM coupons WHERE user_id = $1 ORDER BY claimed_at DESC',
      [session.id]
    );

    return NextResponse.json({ coupons: couponsRes.rows });
  } catch (error: any) {
    console.error('Fetch coupons error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { discount_percentage } = await request.json();

    const discount = parseInt(discount_percentage);
    if (!discount || discount < 1 || discount > 50) {
      return NextResponse.json({ error: 'Discount must be between 1% and 50%.' }, { status: 400 });
    }

    const pointsCost = discount * 100; // 100 points = 1% discount

    // Check user points
    const userRes = await query('SELECT points FROM users WHERE id = $1', [session.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const currentPoints = userRes.rows[0].points || 0;
    if (currentPoints < pointsCost) {
      return NextResponse.json(
        { error: `Insufficient points. You need ${pointsCost} points for a ${discount}% discount.` },
        { status: 400 }
      );
    }

    // Deduct points
    const newPoints = currentPoints - pointsCost;
    await query('UPDATE users SET points = $1 WHERE id = $2', [newPoints, session.id]);

    // Generate unique coupon code
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `HEALTHY-${discount}-${randomHex}`;

    // Save coupon
    const couponRes = await query(
      'INSERT INTO coupons (user_id, code, discount_percentage) VALUES ($1, $2, $3) RETURNING *',
      [session.id, couponCode, discount]
    );

    return NextResponse.json({
      coupon: couponRes.rows[0],
      newPoints,
    });
  } catch (error: any) {
    console.error('Claim coupon error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
