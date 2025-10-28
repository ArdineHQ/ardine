'use client';

import { useEffect, useState } from 'react';

interface Stats {
  users: number;
  teams: number;
  clients: number;
  projects: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersRes, teamsRes, clientsRes, projectsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/teams'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/projects'),
      ]);

      const [users, teams, clients, projects] = await Promise.all([
        usersRes.json(),
        teamsRes.json(),
        clientsRes.json(),
        projectsRes.json(),
      ]);

      setStats({
        users: users.users?.length || 0,
        teams: teams.teams?.length || 0,
        clients: clients.clients?.length || 0,
        projects: projects.projects?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Instance Overview</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.users || 0}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <a href="/admin/users" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all users →
            </a>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Teams</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.teams || 0}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <a href="/admin/teams" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all teams →
            </a>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.clients || 0}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <a href="/admin/clients" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all clients →
            </a>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.projects || 0}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <a href="/admin/projects" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all projects →
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/admin/teams?action=create"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create New Team
          </a>
          <a
            href="/admin/users"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Users
          </a>
        </div>
      </div>
    </div>
  );
}
