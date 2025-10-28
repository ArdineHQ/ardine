'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count: number;
  client_count: number;
  project_count: number;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    generate_invite: true,
    invite_email: ''
  });
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadTeams();
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        await loadTeams();

        // If invite was generated, show it
        if (data.invite) {
          setInviteUrl(data.invite.url);
        } else {
          setShowCreateModal(false);
          setFormData({ name: '', slug: '', generate_invite: true, invite_email: '' });
          alert('Team created successfully');
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setInviteUrl(null);
    setFormData({ name: '', slug: '', generate_invite: true, invite_email: '' });
  };

  const copyInviteLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    }
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This will delete all associated data. This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadTeams();
        alert('Team deleted successfully');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleSwitchContext = async (teamId: string, teamName: string) => {
    if (!confirm(`Switch your context to team "${teamName}"? You will be added as an ADMIN member if not already a member.`)) {
      return;
    }

    try {
      // First, join the team (adds admin as member if needed)
      const joinRes = await fetch(`/api/admin/teams/${teamId}/join`, {
        method: 'POST',
      });

      if (!joinRes.ok) {
        const error = await joinRes.json();
        alert(`Error: ${error.error}`);
        return;
      }

      // Store the team ID in localStorage
      localStorage.setItem('ardine_current_team_id', teamId);

      // Redirect to dashboard - the auth context will reload and pick up the new membership
      router.push('/dashboard');

      // Force a page reload to ensure auth context refreshes
      router.refresh();
    } catch (error) {
      console.error('Error switching team:', error);
      alert('Failed to switch team');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all teams in the instance. Create new teams, view details, and delete teams.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Create Team
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Slug
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Members
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Clients
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Projects
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {team.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {team.slug}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {team.member_count}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {team.client_count}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {team.project_count}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(team.created_at).toLocaleDateString()}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleSwitchContext(team.id, team.name)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Switch
                        </button>
                        <button
                          onClick={() => handleDelete(team.id, team.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            {inviteUrl ? (
              // Show invite link after creation
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Team Created!</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Share this invite link to add an owner to the team:
                </p>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
                  <code className="text-xs break-all">{inviteUrl}</code>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={copyInviteLink}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Show create form
              <>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Team</h2>
                <form onSubmit={handleCreate}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Team Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                        Team Slug
                      </label>
                      <input
                        type="text"
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        pattern="^[a-z0-9-]+$"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="lowercase-with-dashes"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Use lowercase letters, numbers, and dashes only
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          id="generate_invite"
                          checked={formData.generate_invite}
                          onChange={(e) => setFormData({ ...formData, generate_invite: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="generate_invite" className="ml-2 block text-sm text-gray-700">
                          Generate invite link with OWNER role
                        </label>
                      </div>
                      {formData.generate_invite && (
                        <div>
                          <label htmlFor="invite_email" className="block text-sm font-medium text-gray-700">
                            Invite Email (optional)
                          </label>
                          <input
                            type="email"
                            id="invite_email"
                            value={formData.invite_email}
                            onChange={(e) => setFormData({ ...formData, invite_email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="owner@example.com"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Optional: Specify who the invite is for
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      Create Team
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
