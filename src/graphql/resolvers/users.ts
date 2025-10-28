import { builder } from '../schema/builder';
import { UserRef, TeamMemberRef } from '../schema/types';
import { withErrorMapping, ValidationError } from '../errors';
import { requireAuth, requireTeamAccess } from '../context';
import { User } from '../types';
import bcrypt from 'bcrypt';

/**
 * User Queries
 */
builder.queryFields((t) => ({
  me: t.field({
    type: UserRef,
    resolve: async (_parent, _args, ctx) => {
      requireAuth(ctx);

      const result = await ctx.db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [ctx.auth.userId]
      );

      if (result.rows.length === 0) {
        throw new ValidationError('User not found');
      }

      return result.rows[0];
    },
  }),

  teamMembers: t.field({
    type: [TeamMemberRef],
    args: {
      teamId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);
      await requireTeamAccess(ctx, args.teamId);

      const result = await ctx.db.query(
        'SELECT * FROM team_memberships WHERE team_id = $1 ORDER BY created_at DESC',
        [args.teamId]
      );

      return result.rows;
    },
  }),
}));

/**
 * User Mutations
 */
builder.mutationFields((t) => ({
  updateUserProfile: t.field({
    type: UserRef,
    args: {
      name: t.arg.string({ required: false }),
      displayName: t.arg.string({ required: false }),
      email: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 2;

      if (args.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(args.name);
      }

      if (args.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        params.push(args.displayName);
      }

      if (args.email !== undefined) {
        // Check if email is already taken by another user
        const emailCheck = await ctx.db.query<User>(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [args.email, ctx.auth.userId]
        );

        if (emailCheck.rows.length > 0) {
          throw new ValidationError('Email already in use');
        }

        updates.push(`email = $${paramIndex++}`);
        params.push(args.email);
      }

      if (updates.length === 0) {
        // No updates, just return current user
        const result = await ctx.db.query<User>(
          'SELECT * FROM users WHERE id = $1',
          [ctx.auth.userId]
        );
        return result.rows[0];
      }

      updates.push(`updated_at = NOW()`);

      return withErrorMapping(async () => {
        const result = await ctx.db.query<User>(
          `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = $1
          RETURNING *
          `,
          [ctx.auth.userId, ...params]
        );

        return result.rows[0];
      });
    },
  }),

  updateUserPassword: t.field({
    type: 'Boolean',
    args: {
      currentPassword: t.arg.string({ required: true }),
      newPassword: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      requireAuth(ctx);

      // Validate new password strength
      if (args.newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }

      // Get current user with password hash
      const userResult = await ctx.db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [ctx.auth.userId]
      );

      if (userResult.rows.length === 0) {
        throw new ValidationError('User not found');
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(args.currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(args.newPassword, 10);

      // Update password
      await ctx.db.query(
        `
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE id = $1
        `,
        [ctx.auth.userId, newPasswordHash]
      );

      return true;
    },
  }),
}));
