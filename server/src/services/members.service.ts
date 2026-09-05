import { TripRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpError.js';

export async function listMembers(tripId: string) {
  return prisma.tripMember.findMany({
    where: { tripId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function inviteMember(tripId: string, email: string, role: Exclude<TripRole, 'OWNER'>) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw HttpError.notFound('No RouteRoom account exists with that email. They need to register first.');
  }

  const existing = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: user.id } },
  });
  if (existing) {
    throw HttpError.conflict('This user is already a member of the trip');
  }

  return prisma.tripMember.create({
    data: { tripId, userId: user.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateMemberRole(tripId: string, memberId: string, role: Exclude<TripRole, 'OWNER'>) {
  const member = await prisma.tripMember.findUnique({ where: { id: memberId } });
  if (!member || member.tripId !== tripId) {
    throw HttpError.notFound('Member not found on this trip');
  }
  if (member.role === 'OWNER') {
    throw HttpError.badRequest("The trip owner's role cannot be changed");
  }
  return prisma.tripMember.update({ where: { id: memberId }, data: { role } });
}

export async function removeMember(tripId: string, memberId: string) {
  const member = await prisma.tripMember.findUnique({ where: { id: memberId } });
  if (!member || member.tripId !== tripId) {
    throw HttpError.notFound('Member not found on this trip');
  }
  if (member.role === 'OWNER') {
    throw HttpError.badRequest('The trip owner cannot be removed. Delete the trip instead.');
  }
  await prisma.tripMember.delete({ where: { id: memberId } });
}
