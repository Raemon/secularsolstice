import { NextRequest, NextResponse } from 'next/server';
import { getProgramById, updateProgramElementIds, updateProgram } from '../../../../lib/programsRepository';
import sql from '@/lib/db';

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const program = await getProgramById(id);
    if (!program) {
      return NextResponse.json({error: 'Program not found'}, {status: 404});
    }
    return NextResponse.json({program});
  } catch (error) {
    console.error('Failed to load program:', error);
    return NextResponse.json({error: 'Failed to load program'}, {status: 500});
  }
}

type VerifiedUser = { username: string; isAdmin: boolean } | null;

const getVerifiedUser = async (userId?: string): Promise<VerifiedUser> => {
  if (!userId) return null;
  const rows = await sql`SELECT username, is_admin FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return null;
  return { username: rows[0].username, isAdmin: rows[0].is_admin };
};

const checkUserCanModifyLocked = (program: { locked: boolean; createdBy: string | null }, user: VerifiedUser): boolean => {
  if (!program.locked) return true;
  if (user?.isAdmin) return true;
  if (user?.username && program.createdBy === user.username) return true;
  return false;
};

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = await request.json();
    const { userId } = body;

    // Verify user from database - never trust client-sent isAdmin/userName
    const verifiedUser = await getVerifiedUser(userId);
    
    // Handle element/program ID updates (reordering)
    if ('elementIds' in body || 'programIds' in body) {
      if (!verifiedUser) {
        return NextResponse.json({error: 'Must be logged in to change version'}, {status: 401});
      }

      const existingProgram = await getProgramById(id);
      if (!existingProgram) {
        return NextResponse.json({error: 'Program not found'}, {status: 404});
      }
      // If program is locked, no one can rearrange elements/programs
      if (existingProgram.locked) {
        return NextResponse.json({error: 'Cannot rearrange elements in a locked program'}, {status: 403});
      }
      const {elementIds, programIds} = body;
      if (!Array.isArray(elementIds) || !Array.isArray(programIds)) {
        return NextResponse.json({error: 'elementIds and programIds must be arrays'}, {status: 400});
      }
      const program = await updateProgramElementIds(id, elementIds, programIds, verifiedUser.username);
      return NextResponse.json({program});
    }

    const existingProgram = await getProgramById(id);
    if (!existingProgram) {
      return NextResponse.json({error: 'Program not found'}, {status: 404});
    }

    // Handle other field updates
    const canModify = checkUserCanModifyLocked(existingProgram, verifiedUser);
    
    // If program is locked and user can't modify it, reject all changes
    if (existingProgram.locked && !canModify) {
      return NextResponse.json({error: 'Program is locked'}, {status: 403});
    }

    // If program is locked and user CAN modify it, only allow changing the locked field
    if (existingProgram.locked && canModify) {
      const allowedKeys = ['locked', 'userId'];
      const hasDisallowedKeys = Object.keys(body).some(key => !allowedKeys.includes(key));
      if (hasDisallowedKeys) {
        return NextResponse.json({error: 'Can only change locked status on a locked program'}, {status: 403});
      }
    }

    // Only admins can change createdBy
    if ('createdBy' in body && !verifiedUser?.isAdmin) {
      return NextResponse.json({error: 'Only admins can change createdBy'}, {status: 403});
    }
  
    const updates: {title?: string; printProgramForeword?: string | null; printProgramEpitaph?: string | null; videoUrl?: string | null; isSubprogram?: boolean; locked?: boolean; createdBy?: string | null} = {};
    if ('title' in body) updates.title = body.title;
    if ('printProgramForeword' in body) updates.printProgramForeword = body.printProgramForeword;
    if ('printProgramEpitaph' in body) updates.printProgramEpitaph = body.printProgramEpitaph;
    if ('videoUrl' in body) updates.videoUrl = body.videoUrl;
    if ('isSubprogram' in body) updates.isSubprogram = body.isSubprogram === true;
    if ('locked' in body) updates.locked = body.locked === true;
    if ('createdBy' in body) updates.createdBy = body.createdBy;
    const program = await updateProgram(id, updates, verifiedUser?.username);
    return NextResponse.json({program});
  } catch (error) {
    console.error('Failed to update program:', error);
    return NextResponse.json({error: 'Failed to update program'}, {status: 500});
  }
}