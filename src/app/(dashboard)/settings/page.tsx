'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useAuth } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const ME_QUERY = gql(`
  query Me {
    me {
      id
      email
      name
      displayName
    }
  }
`);

const UPDATE_PROFILE_MUTATION = gql(`
  mutation UpdateUserProfile(
    $name: String
    $displayName: String
    $email: String
  ) {
    updateUserProfile(
      name: $name
      displayName: $displayName
      email: $email
    ) {
      id
      email
      name
      displayName
    }
  }
`);

const UPDATE_PASSWORD_MUTATION = gql(`
  mutation UpdateUserPassword(
    $currentPassword: String!
    $newPassword: String!
  ) {
    updateUserPassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    )
  }
`);

export default function SettingsPage() {
  const { user } = useAuth();

  // Profile form state
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [meResult] = useQuery({
    query: ME_QUERY,
    pause: !user,
  });

  const [, updateProfileMutation] = useMutation(UPDATE_PROFILE_MUTATION);
  const [, updatePasswordMutation] = useMutation(UPDATE_PASSWORD_MUTATION);

  // Initialize form with current user data
  useEffect(() => {
    if (meResult.data?.me) {
      setName(meResult.data.me.name || '');
      setDisplayName(meResult.data.me.displayName || '');
      setEmail(meResult.data.me.email || '');
    }
  }, [meResult.data]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');

    const result = await updateProfileMutation({
      name: name || undefined,
      displayName: displayName || undefined,
      email: email || undefined,
    });

    if (result.error) {
      setProfileError(result.error.message);
    } else {
      setProfileMessage('Profile updated successfully');
      setTimeout(() => setProfileMessage(''), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    const result = await updatePasswordMutation({
      currentPassword,
      newPassword,
    });

    if (result.error) {
      setPasswordError(result.error.message);
    } else {
      setPasswordMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    }
  };

  if (meResult.fetching && !meResult.data) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 dark:text-foreground">Settings</h1>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-card-foreground">Profile Information</h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be displayed (optional)"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>

            {profileMessage && (
              <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
                {profileMessage}
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
                {profileError}
              </div>
            )}

            <Button type="submit">Update Profile</Button>
          </form>
        </Card>

        {/* Password Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-card-foreground">Change Password</h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 8 characters)"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
              />
            </div>

            {passwordMessage && (
              <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
                {passwordError}
              </div>
            )}

            <Button type="submit">Change Password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
