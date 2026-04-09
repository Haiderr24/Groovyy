import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabase();

    // Clear listening_history collection for this user
    const result = await db.collection('listening_history').deleteMany({
      userId: new ObjectId(decoded.userId)
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deletedCount} listening events`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error clearing listening history:', error);
    return NextResponse.json(
      { error: 'Failed to clear listening history' },
      { status: 500 }
    );
  }
}
