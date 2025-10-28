'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'urql';
import { gql } from '@/lib/gql';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const LIST_PROJECTS_QUERY = gql(`
  query ListProjectsForTimeEntry($args: ListArgs!) {
    projects(args: $args) {
      nodes {
        id
        name
        code
        client {
          id
          name
        }
      }
      total
    }
  }
`);

const LIST_TASKS_QUERY = gql(`
  query ListTasksForTimeEntry($projectId: ID!, $status: Status) {
    project(id: $projectId) {
      id
      tasks(status: $status, limit: 100) {
        nodes {
          id
          name
        }
      }
    }
  }
`);

const CREATE_TIME_ENTRY_MUTATION = gql(`
  mutation CreateTimeEntry(
    $projectId: ID!
    $taskId: ID
    $note: String
    $startedAt: DateTime!
    $stoppedAt: DateTime!
    $billable: Boolean
  ) {
    createTimeEntry(
      projectId: $projectId
      taskId: $taskId
      note: $note
      startedAt: $startedAt
      stoppedAt: $stoppedAt
      billable: $billable
    ) {
      id
      note
      startedAt
      stoppedAt
      durationSeconds
      billable
    }
  }
`);

const UPDATE_TIME_ENTRY_MUTATION = gql(`
  mutation UpdateTimeEntry(
    $timeEntryId: ID!
    $projectId: ID
    $taskId: ID
    $note: String
    $startedAt: DateTime
    $stoppedAt: DateTime
    $billable: Boolean
  ) {
    updateTimeEntry(
      timeEntryId: $timeEntryId
      projectId: $projectId
      taskId: $taskId
      note: $note
      startedAt: $startedAt
      stoppedAt: $stoppedAt
      billable: $billable
    ) {
      id
      note
      startedAt
      stoppedAt
      durationSeconds
      billable
    }
  }
`);

const DELETE_TIME_ENTRY_MUTATION = gql(`
  mutation DeleteTimeEntry($timeEntryId: ID!) {
    deleteTimeEntry(timeEntryId: $timeEntryId)
  }
`);

interface TimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  timeEntry?: {
    id: string;
    projectId: string;
    taskId?: string | null;
    note?: string | null;
    startedAt: string;
    stoppedAt?: string | null;
    billable: boolean;
  } | null;
}

export function TimeEntryModal({
  open,
  onOpenChange,
  onSuccess,
  timeEntry,
}: TimeEntryModalProps) {
  const { currentTeam } = useAuth();
  const isEditMode = !!timeEntry;

  // Form state
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [billable, setBillable] = useState(true);

  // Fetch projects
  const [projectsResult] = useQuery({
    query: LIST_PROJECTS_QUERY,
    variables: {
      args: {
        teamId: currentTeam?.id || '',
        limit: 100,
        offset: 0,
      },
    },
    pause: !currentTeam?.id || !open,
  });

  // Fetch tasks for selected project
  const [tasksResult] = useQuery({
    query: LIST_TASKS_QUERY,
    variables: {
      projectId: projectId,
      status: 'active',
    },
    pause: !projectId || !open,
  });

  const [, createTimeEntryMutation] = useMutation(CREATE_TIME_ENTRY_MUTATION);
  const [, updateTimeEntryMutation] = useMutation(UPDATE_TIME_ENTRY_MUTATION);
  const [, deleteTimeEntryMutation] = useMutation(DELETE_TIME_ENTRY_MUTATION);

  const projects = projectsResult.data?.projects.nodes || [];
  const tasks = tasksResult.data?.project?.tasks.nodes || [];

  // Initialize form with existing time entry data
  useEffect(() => {
    if (timeEntry) {
      setProjectId(timeEntry.projectId);
      setTaskId(timeEntry.taskId || '');
      setNote(timeEntry.note || '');
      setBillable(timeEntry.billable);

      const startDate = new Date(timeEntry.startedAt);
      setDate(startDate.toISOString().split('T')[0]);
      setStartTime(
        startDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      if (timeEntry.stoppedAt) {
        const endDate = new Date(timeEntry.stoppedAt);
        setEndTime(
          endDate.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      }
    } else {
      // Reset form for new entry
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setStartTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setEndTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setProjectId('');
      setTaskId('');
      setNote('');
      setBillable(true);
    }
  }, [timeEntry, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !date || !startTime || !endTime) {
      return;
    }

    // Combine date and times into ISO strings
    const startedAt = new Date(`${date}T${startTime}`).toISOString();
    const stoppedAt = new Date(`${date}T${endTime}`).toISOString();

    if (isEditMode && timeEntry) {
      const result = await updateTimeEntryMutation({
        timeEntryId: timeEntry.id,
        projectId,
        taskId: taskId || null,
        note: note || null,
        startedAt,
        stoppedAt,
        billable,
      });

      if (!result.error) {
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      const result = await createTimeEntryMutation({
        projectId,
        taskId: taskId || null,
        note: note || null,
        startedAt,
        stoppedAt,
        billable,
      });

      if (!result.error) {
        onOpenChange(false);
        onSuccess?.();
      }
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !timeEntry) return;

    if (confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      const result = await deleteTimeEntryMutation({
        timeEntryId: timeEntry.id,
      });

      if (!result.error) {
        onOpenChange(false);
        onSuccess?.();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="project">Project *</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId(''); // Reset task when project changes
                }}
                required
                className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground"
              >
                <option value="">Select a project...</option>
                {projects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `[${project.code}] ` : ''}
                    {project.name}
                    {project.client ? ` - ${project.client.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="task">Task (optional)</Label>
              <select
                id="task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!projectId}
                className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring bg-background dark:bg-background text-foreground dark:text-foreground disabled:opacity-50"
              >
                <option value="">No task</option>
                {tasks.map((task: any) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="billable"
                checked={billable}
                onCheckedChange={(checked) => setBillable(checked === true)}
              />
              <Label htmlFor="billable" className="cursor-pointer">
                Billable
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="flex gap-3">
              <Button type="submit" disabled={!projectId || !date || !startTime || !endTime}>
                {isEditMode ? 'Update' : 'Create'} Time Entry
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
            {isEditMode && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
