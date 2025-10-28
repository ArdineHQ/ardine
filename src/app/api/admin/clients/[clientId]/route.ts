import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * DELETE /api/admin/clients/[clientId]
 * Delete a client (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const authResult = await requireAdminAuth(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { clientId } = await params;

  try {
    // Check if client exists
    const clientResult = await db(
      'SELECT id, name, team_id FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete client (cascading deletes should handle related records)
    await db('DELETE FROM clients WHERE id = $1', [clientId]);

    return NextResponse.json({
      message: 'Client deleted successfully',
      client: clientResult.rows[0],
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
