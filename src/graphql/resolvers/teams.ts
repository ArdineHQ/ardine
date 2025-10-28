import { builder } from '../schema/builder';
import { TeamRef, TeamMemberRef } from '../schema/types';
import { withErrorMapping, ValidationError, UnauthorizedError } from '../errors';
import { requireAuth, requireUserId, requireTeamAccess } from '../context';
import { Team, TeamMembership } from '../types';
import crypto from 'crypto';

// Invite type
const InviteRef = builder.objectRef<{
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
}>('Invite');

InviteRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    teamId: t.exposeID('team_id'),
    email: t.exposeString('email'),
    role: t.exposeString('role'),
    token: t.exposeString('token'),
    expiresAt: t.expose('expires_at', { type: 'DateTime' }),
    acceptedAt: t.expose('accepted_at', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('created_at', { type: 'DateTime' }),
  }),
});

/**
 * Team Queries
 */
builder.queryFields((t) => ({
  team: t.field({
    type: TeamRef,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.id);

      const result = await ctx.db.query<Team>(
        'SELECT * FROM teams WHERE id = $1',
        [args.id]
      );

      return result.rows[0] || null;
    },
  }),

  teamInvites: t.field({
    type: [InviteRef],
    args: {
      teamId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      // Only admins and owners can view invites
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can view invitations');
      }

      const result = await ctx.db.query(
        `SELECT * FROM invites
         WHERE team_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [args.teamId]
      );

      return result.rows;
    },
  }),

  invite: t.field({
    type: InviteRef,
    nullable: true,
    args: {
      token: t.arg.string({ required: true }),
      includeAccepted: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Anyone can view an invite by token (no auth required)
      // If includeAccepted is true, show accepted invites too (for checking status)
      const acceptedFilter = args.includeAccepted ? '' : 'AND i.accepted_at IS NULL';

      const result = await ctx.db.query(
        `SELECT i.*, t.name as team_name
         FROM invites i
         JOIN teams t ON i.team_id = t.id
         WHERE i.token = $1 ${acceptedFilter} AND i.expires_at > NOW()`,
        [args.token]
      );

      return result.rows[0] || null;
    },
  }),

  inviteWithStatus: t.field({
    type: InviteRef,
    nullable: true,
    args: {
      token: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      // Check if user already accepted this invite
      if (ctx.auth.userId) {
        const membershipCheck = await ctx.db.query(
          `SELECT tm.id FROM invites i
           JOIN team_memberships tm ON tm.team_id = i.team_id AND tm.user_id = $2
           WHERE i.token = $1`,
          [args.token, ctx.auth.userId]
        );

        if (membershipCheck.rows.length > 0) {
          // User is already a member, they probably accepted this invite
          return null; // Will show as already member
        }
      }

      // Return invite if valid and not accepted
      const result = await ctx.db.query(
        `SELECT i.*, t.name as team_name
         FROM invites i
         JOIN teams t ON i.team_id = t.id
         WHERE i.token = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
        [args.token]
      );

      return result.rows[0] || null;
    },
  }),
}));

/**
 * Team Mutations
 */
builder.mutationFields((t) => ({
  updateTeam: t.field({
    type: TeamRef,
    args: {
      teamId: t.arg.id({ required: true }),
      name: t.arg.string({ required: false }),
      billingAddress: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      // Only owners and admins can update team
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can update team information');
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 2;

      if (args.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(args.name);
      }

      if (args.billingAddress !== undefined) {
        updates.push(`billing_address = $${paramIndex++}`);
        params.push(args.billingAddress);
      }

      if (updates.length === 0) {
        // No updates, just return current team
        const result = await ctx.db.query<Team>(
          'SELECT * FROM teams WHERE id = $1',
          [args.teamId]
        );
        return result.rows[0];
      }

      updates.push(`updated_at = NOW()`);

      return withErrorMapping(async () => {
        const result = await ctx.db.query<Team>(
          `UPDATE teams SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
          [args.teamId, ...params]
        );

        return result.rows[0];
      });
    },
  }),

  updateTeamMemberRole: t.field({
    type: TeamMemberRef,
    args: {
      membershipId: t.arg.id({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Get the membership to check team access
      const membership = await ctx.db.query<TeamMembership>(
        'SELECT * FROM team_memberships WHERE id = $1',
        [args.membershipId]
      );

      if (membership.rows.length === 0) {
        throw new ValidationError('Team membership not found');
      }

      await requireTeamAccess(ctx, membership.rows[0].team_id);

      // Only owners can update roles
      // Admins can update roles for non-owner members
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can update member roles');
      }

      // Prevent non-owners from changing owner roles
      if (ctx.auth.teamRole === 'ADMIN' && membership.rows[0].role === 'OWNER') {
        throw new UnauthorizedError('Only team owners can modify owner roles');
      }

      // Validate role
      const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'BILLING'];
      if (!validRoles.includes(args.role)) {
        throw new ValidationError('Invalid role');
      }

      // Prevent changing the last owner
      if (membership.rows[0].role === 'OWNER' && args.role !== 'OWNER') {
        const ownerCount = await ctx.db.query(
          'SELECT COUNT(*) as count FROM team_memberships WHERE team_id = $1 AND role = $2',
          [membership.rows[0].team_id, 'OWNER']
        );

        if (parseInt(ownerCount.rows[0].count) <= 1) {
          throw new ValidationError('Cannot change the last owner role');
        }
      }

      return withErrorMapping(async () => {
        const result = await ctx.db.query<TeamMembership>(
          `UPDATE team_memberships
           SET role = $2
           WHERE id = $1
           RETURNING *`,
          [args.membershipId, args.role]
        );

        return result.rows[0];
      });
    },
  }),

  removeTeamMember: t.field({
    type: 'Boolean',
    args: {
      membershipId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Get the membership to check team access
      const membership = await ctx.db.query<TeamMembership>(
        'SELECT * FROM team_memberships WHERE id = $1',
        [args.membershipId]
      );

      if (membership.rows.length === 0) {
        throw new ValidationError('Team membership not found');
      }

      await requireTeamAccess(ctx, membership.rows[0].team_id);

      // Only owners and admins can remove members
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can remove members');
      }

      // Prevent non-owners from removing owners
      if (ctx.auth.teamRole === 'ADMIN' && membership.rows[0].role === 'OWNER') {
        throw new UnauthorizedError('Only team owners can remove other owners');
      }

      // Prevent removing the last owner
      if (membership.rows[0].role === 'OWNER') {
        const ownerCount = await ctx.db.query(
          'SELECT COUNT(*) as count FROM team_memberships WHERE team_id = $1 AND role = $2',
          [membership.rows[0].team_id, 'OWNER']
        );

        if (parseInt(ownerCount.rows[0].count) <= 1) {
          throw new ValidationError('Cannot remove the last owner');
        }
      }

      return withErrorMapping(async () => {
        await ctx.db.query(
          'DELETE FROM team_memberships WHERE id = $1',
          [args.membershipId]
        );

        return true;
      });
    },
  }),

  createInvite: t.field({
    type: InviteRef,
    args: {
      teamId: t.arg.id({ required: true }),
      email: t.arg.string({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      // Only owners and admins can create invites
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can create invitations');
      }

      // Validate role (invites can't create owners)
      const validRoles = ['ADMIN', 'MEMBER', 'VIEWER', 'BILLING'];
      if (!validRoles.includes(args.role)) {
        throw new ValidationError('Invalid role. Valid roles: ADMIN, MEMBER, VIEWER, BILLING');
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(args.email)) {
        throw new ValidationError('Invalid email address');
      }

      // Check if user is already a member
      const existingMember = await ctx.db.query(
        `SELECT tm.id FROM team_memberships tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1 AND u.email = $2`,
        [args.teamId, args.email.toLowerCase()]
      );

      if (existingMember.rows.length > 0) {
        throw new ValidationError('User is already a member of this team');
      }

      // Check if there's already a pending invite for this email
      const existingInvite = await ctx.db.query(
        `SELECT id FROM invites
         WHERE team_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
        [args.teamId, args.email.toLowerCase()]
      );

      if (existingInvite.rows.length > 0) {
        throw new ValidationError('An invitation has already been sent to this email');
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');

      // Create invite (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      return withErrorMapping(async () => {
        const result = await ctx.db.query(
          `INSERT INTO invites (team_id, email, role, token, expires_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [args.teamId, args.email.toLowerCase(), args.role, token, expiresAt]
        );

        return result.rows[0];
      });
    },
  }),

  cancelInvite: t.field({
    type: 'Boolean',
    args: {
      inviteId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Get the invite to check team access
      const invite = await ctx.db.query(
        'SELECT * FROM invites WHERE id = $1',
        [args.inviteId]
      );

      if (invite.rows.length === 0) {
        throw new ValidationError('Invitation not found');
      }

      await requireTeamAccess(ctx, invite.rows[0].team_id);

      // Only owners and admins can cancel invites
      if (ctx.auth.teamRole !== 'OWNER' && ctx.auth.teamRole !== 'ADMIN') {
        throw new UnauthorizedError('Only team owners and admins can cancel invitations');
      }

      return withErrorMapping(async () => {
        await ctx.db.query('DELETE FROM invites WHERE id = $1', [args.inviteId]);
        return true;
      });
    },
  }),

  acceptInvite: t.field({
    type: TeamMemberRef,
    args: {
      token: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      // Only require userId, not teamId, since user might not have a team yet
      requireUserId(ctx);

      // Get the invite
      const inviteResult = await ctx.db.query(
        `SELECT * FROM invites
         WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [args.token]
      );

      if (inviteResult.rows.length === 0) {
        throw new ValidationError('Invalid or expired invitation');
      }

      const invite = inviteResult.rows[0];

      // Get the user's email
      const userResult = await ctx.db.query(
        'SELECT email FROM users WHERE id = $1',
        [ctx.auth.userId]
      );

      const userEmail = userResult.rows[0].email;

      // Verify the email matches (case-insensitive)
      if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
        throw new ValidationError('This invitation was sent to a different email address');
      }

      // Check if user is already a member
      const existingMember = await ctx.db.query(
        'SELECT id FROM team_memberships WHERE team_id = $1 AND user_id = $2',
        [invite.team_id, ctx.auth.userId]
      );

      if (existingMember.rows.length > 0) {
        throw new ValidationError('You are already a member of this team');
      }

      return withErrorMapping(async () => {
        // Create team membership
        const memberResult = await ctx.db.query<TeamMembership>(
          `INSERT INTO team_memberships (team_id, user_id, role)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [invite.team_id, ctx.auth.userId, invite.role]
        );

        // Mark invite as accepted
        await ctx.db.query(
          'UPDATE invites SET accepted_at = NOW() WHERE id = $1',
          [invite.id]
        );

        return memberResult.rows[0];
      });
    },
  }),
}));
