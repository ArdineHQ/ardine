'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { useAuth, useCanAccessInvoices } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/time-utils';

const LIST_CLIENTS_QUERY = gql(`
  query ListClientsForInvoice($args: ListArgs!) {
    clients(args: $args) {
      nodes {
        id
        name
        defaultHourlyRateCents
      }
      total
    }
  }
`);

const LIST_UNBILLED_TIME_ENTRIES_QUERY = gql(`
  query ListUnbilledTimeEntries($teamId: ID!, $clientId: ID!) {
    timeEntries(
      teamId: $teamId
      clientId: $clientId
      uninvoicedOnly: true
      billable: true
      limit: 500
      orderBy: "started_at"
      order: "desc"
    ) {
      nodes {
        id
        note
        startedAt
        stoppedAt
        durationSeconds
        billable
        hourlyRateCents
        amountCents
        user {
          id
          name
          displayName
        }
        project {
          id
          name
          code
          defaultHourlyRateCents
        }
        task {
          id
          name
          hourlyRateCents
        }
      }
    }
  }
`);

const CREATE_INVOICE_MUTATION = gql(`
  mutation CreateInvoice($input: InvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
    }
  }
`);

const ADD_INVOICE_ITEM_MUTATION = gql(`
  mutation AddInvoiceItem($invoiceId: ID!, $input: InvoiceItemInput!) {
    addInvoiceItem(invoiceId: $invoiceId, input: $input) {
      id
      description
      quantity
      rateCents
      amountCents
    }
  }
`);

interface TimeEntry {
  id: string;
  note: string | null;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number;
  billable: boolean;
  hourlyRateCents: number | null;
  amountCents: number | null;
  user: {
    id: string;
    name: string;
    displayName: string | null;
  };
  project: {
    id: string;
    name: string;
    code: string | null;
    defaultHourlyRateCents: number | null;
  };
  task: {
    id: string;
    name: string;
    hourlyRateCents: number | null;
  } | null;
}

interface GroupedEntry {
  groupKey: string;
  projectName: string;
  projectCode: string | null;
  taskName: string | null;
  hourlyRateCents: number;
  entries: TimeEntry[];
  totalHours: number;
  totalAmount: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rateCents: string;
  timeEntryId?: string;
  isManual: boolean;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { currentTeam } = useAuth();
  const canAccessInvoices = useCanAccessInvoices();

  // Redirect if user doesn't have access to invoices
  useEffect(() => {
    if (currentTeam && !canAccessInvoices) {
      router.push('/dashboard');
    }
  }, [currentTeam, canAccessInvoices, router]);

  // Don't render if user doesn't have access
  if (!canAccessInvoices) {
    return null;
  }

  // Form state
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [issuedDate, setIssuedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [taxRatePercent, setTaxRatePercent] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [groupRates, setGroupRates] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clientsResult] = useQuery({
    query: LIST_CLIENTS_QUERY,
    variables: {
      args: {
        teamId: currentTeam?.id || '',
        limit: 100,
        offset: 0,
      },
    },
    pause: !currentTeam?.id,
  });

  const [timeEntriesResult] = useQuery({
    query: LIST_UNBILLED_TIME_ENTRIES_QUERY,
    variables: {
      teamId: currentTeam?.id || '',
      clientId: clientId || '',
    },
    pause: !currentTeam?.id || !clientId,
  });

  const [, createInvoiceMutation] = useMutation(CREATE_INVOICE_MUTATION);
  const [, addInvoiceItemMutation] = useMutation(ADD_INVOICE_ITEM_MUTATION);

  const clients = clientsResult.data?.clients.nodes || [];
  const selectedClient = clients.find((c: any) => c.id === clientId);
  const timeEntries = (timeEntriesResult.data?.timeEntries.nodes || []) as TimeEntry[];

  // Filter for stopped time entries only (server already filters for unbilled & billable)
  const unbilledTimeEntries = timeEntries.filter((entry) => entry.stoppedAt);

  // Helper to get the effective hourly rate for a time entry
  const getEffectiveRate = (entry: TimeEntry): number => {
    // Priority: task rate > project rate > client rate > $0
    if (entry.task?.hourlyRateCents) {
      return entry.task.hourlyRateCents;
    }
    if (entry.project.defaultHourlyRateCents) {
      return entry.project.defaultHourlyRateCents;
    }
    if (selectedClient?.defaultHourlyRateCents) {
      return selectedClient.defaultHourlyRateCents;
    }
    return 0;
  };

  // Group time entries by project, task, and rate
  const groupedEntries: GroupedEntry[] = unbilledTimeEntries.reduce((acc, entry) => {
    const effectiveRate = getEffectiveRate(entry);
    const groupKey = `${entry.project.id}-${entry.task?.id || 'no-task'}-${effectiveRate}`;

    let group = acc.find((g) => g.groupKey === groupKey);
    if (!group) {
      const totalHours = entry.durationSeconds / 3600;
      group = {
        groupKey,
        projectName: entry.project.name,
        projectCode: entry.project.code,
        taskName: entry.task?.name || null,
        hourlyRateCents: effectiveRate,
        entries: [entry],
        totalHours,
        totalAmount: (totalHours * effectiveRate) / 100,
      };
      acc.push(group);
    } else {
      group.entries.push(entry);
      const hours = entry.durationSeconds / 3600;
      group.totalHours += hours;
      group.totalAmount += (hours * effectiveRate) / 100;
    }

    return acc;
  }, [] as GroupedEntry[]);

  // Group by project for display
  const groupedByProject = groupedEntries.reduce((acc, group) => {
    const projectKey = group.entries[0].project.id;
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: group.entries[0].project,
        groups: [],
      };
    }
    acc[projectKey].groups.push(group);
    return acc;
  }, {} as Record<string, { project: any; groups: GroupedEntry[] }>);

  const toggleGroup = (groupKey: string) => {
    const newSelectedGroups = new Set(selectedGroups);
    const newSelectedEntries = new Set(selectedEntries);
    const group = groupedEntries.find((g) => g.groupKey === groupKey);

    if (newSelectedGroups.has(groupKey)) {
      // Deselect group and all its entries
      newSelectedGroups.delete(groupKey);
      group?.entries.forEach((entry) => newSelectedEntries.delete(entry.id));
    } else {
      // Select group and all its entries
      newSelectedGroups.add(groupKey);
      group?.entries.forEach((entry) => newSelectedEntries.add(entry.id));
    }
    setSelectedGroups(newSelectedGroups);
    setSelectedEntries(newSelectedEntries);
  };

  const toggleEntry = (entryId: string, groupKey: string) => {
    const newSelectedEntries = new Set(selectedEntries);
    const newSelectedGroups = new Set(selectedGroups);
    const group = groupedEntries.find((g) => g.groupKey === groupKey);

    if (newSelectedEntries.has(entryId)) {
      newSelectedEntries.delete(entryId);
      // If no entries in this group are selected, deselect the group
      const anySelected = group?.entries.some((e) => newSelectedEntries.has(e.id));
      if (!anySelected) {
        newSelectedGroups.delete(groupKey);
      }
    } else {
      newSelectedEntries.add(entryId);
      // Add the group if it wasn't selected
      newSelectedGroups.add(groupKey);
    }

    setSelectedEntries(newSelectedEntries);
    setSelectedGroups(newSelectedGroups);
  };

  const selectAllGroups = () => {
    const allKeys = groupedEntries.map((g) => g.groupKey);
    const allEntryIds = groupedEntries.flatMap((g) => g.entries.map((e) => e.id));
    setSelectedGroups(new Set(allKeys));
    setSelectedEntries(new Set(allEntryIds));
    // Initialize rates for all groups
    const rates = new Map<string, number>();
    groupedEntries.forEach((group) => {
      rates.set(group.groupKey, group.hourlyRateCents);
    });
    setGroupRates(rates);
  };

  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
    setSelectedEntries(new Set());
  };

  const updateGroupRate = (groupKey: string, rateCents: number) => {
    const newRates = new Map(groupRates);
    newRates.set(groupKey, rateCents);
    setGroupRates(newRates);
  };

  const getGroupRate = (group: GroupedEntry): number => {
    return groupRates.get(group.groupKey) ?? group.hourlyRateCents;
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: '1',
        rateCents: '0',
        isManual: true,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string
  ) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateSubtotal = () => {
    // Calculate from manual line items
    const manualTotal = lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rateCents) || 0;
      return sum + quantity * rate;
    }, 0);

    // Calculate from selected individual entries only
    const timeEntryTotal = Array.from(selectedGroups).reduce((sum, groupKey) => {
      const group = groupedEntries.find((g) => g.groupKey === groupKey);
      if (group) {
        const rate = getGroupRate(group);
        // Only count selected entries in this group
        const selectedEntriesInGroup = group.entries.filter((entry) =>
          selectedEntries.has(entry.id)
        );
        const totalHours = selectedEntriesInGroup.reduce(
          (hours, entry) => hours + entry.durationSeconds / 3600,
          0
        );
        return sum + (totalHours * rate) / 100;
      }
      return sum;
    }, 0);

    return manualTotal + timeEntryTotal;
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = parseFloat(taxRatePercent) || 0;
    return (subtotal * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate we have at least one item
      const validLineItems = lineItems.filter(
        (item) => item.description.trim() !== ''
      );

      if (validLineItems.length === 0 && selectedGroups.size === 0) {
        setError('Please add at least one time entry or line item');
        setIsSubmitting(false);
        return;
      }

      // Create invoice
      const invoiceResult = await createInvoiceMutation({
        input: {
          teamId: currentTeam?.id || '',
          clientId,
          invoiceNumber,
          status: 'draft',
          issuedDate,
          dueDate,
          taxRatePercent: parseFloat(taxRatePercent) || 0,
          notes: notes || undefined,
        },
      });

      if (invoiceResult.error) {
        setError(invoiceResult.error.message);
        setIsSubmitting(false);
        return;
      }

      const newInvoiceId = invoiceResult.data?.createInvoice.id;

      // Add grouped time entries as combined line items (only selected entries)
      for (const groupKey of Array.from(selectedGroups)) {
        const group = groupedEntries.find((g) => g.groupKey === groupKey);
        if (group) {
          // Only include selected entries from this group
          const selectedEntriesInGroup = group.entries.filter((entry) =>
            selectedEntries.has(entry.id)
          );

          if (selectedEntriesInGroup.length === 0) continue;

          const projectName = group.projectCode
            ? `[${group.projectCode}] ${group.projectName}`
            : group.projectName;
          const taskName = group.taskName ? ` - ${group.taskName}` : '';
          const description = `${projectName}${taskName}`;
          const rate = getGroupRate(group);

          // Calculate total hours from selected entries only
          const totalHours = selectedEntriesInGroup.reduce(
            (sum, entry) => sum + entry.durationSeconds / 3600,
            0
          );

          // Add one line item for the selected entries in this group
          const result = await addInvoiceItemMutation({
            invoiceId: newInvoiceId,
            input: {
              timeEntryIds: selectedEntriesInGroup.map((e) => e.id),
              description,
              quantity: totalHours,
              rateCents: rate,
            },
          });

          if (result.error) {
            throw new Error(result.error.message);
          }
        }
      }

      // Add manual line items
      for (const item of validLineItems) {
        await addInvoiceItemMutation({
          invoiceId: newInvoiceId,
          input: {
            description: item.description,
            quantity: parseFloat(item.quantity) || 0,
            rateCents: Math.round(parseFloat(item.rateCents) * 100) || 0,
          },
        });
      }

      router.push(`/invoices/${newInvoiceId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
        <h1 className="text-3xl font-bold dark:text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="client">Client *</Label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              >
                <option value="">Select a client...</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                required
              />
            </div>

            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="issuedDate">Issued Date *</Label>
              <Input
                id="issuedDate"
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-3 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              />
            </div>
          </div>
        </Card>

        {/* Time Entries from Projects/Tasks */}
        {clientId && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Time Entries ({selectedGroups.size} groups selected)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Entries are grouped by project, task, and rate. You can adjust rates before adding to invoice.
                </p>
              </div>
              {groupedEntries.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllGroups}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllGroups}
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>

            {timeEntriesResult.fetching ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading time entries...
              </div>
            ) : unbilledTimeEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unbilled time entries found for this client
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(groupedByProject).map(({ project, groups }) => (
                  <div key={project.id} className="border dark:border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">
                      {project.code ? `[${project.code}] ` : ''}
                      {project.name}
                    </h3>
                    <div className="space-y-3">
                      {groups.map((group) => {
                        const currentRate = getGroupRate(group);
                        const selectedEntriesInGroup = group.entries.filter((entry) =>
                          selectedEntries.has(entry.id)
                        );
                        const selectedHours = selectedEntriesInGroup.reduce(
                          (sum, entry) => sum + entry.durationSeconds / 3600,
                          0
                        );
                        const amount = (selectedHours * currentRate) / 100;

                        return (
                          <div
                            key={group.groupKey}
                            className="flex items-start gap-3 p-3 rounded-md border dark:border-border bg-muted/20"
                          >
                            <div className="pt-1">
                              <Checkbox
                                checked={selectedGroups.has(group.groupKey)}
                                onCheckedChange={() => toggleGroup(group.groupKey)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {group.taskName && (
                                  <span className="text-sm font-medium">{group.taskName}</span>
                                )}
                                {!group.taskName && (
                                  <span className="text-sm text-muted-foreground">No specific task</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ({selectedEntriesInGroup.length} of {group.entries.length} selected)
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{selectedHours.toFixed(2)} hrs selected</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs mb-0">Rate:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={(currentRate / 100).toFixed(2)}
                                    onChange={(e) => {
                                      const newRate = Math.round(parseFloat(e.target.value) * 100) || 0;
                                      updateGroupRate(group.groupKey, newRate);
                                    }}
                                    className="w-24 h-7 text-xs"
                                    placeholder="0.00"
                                  />
                                  <span className="text-xs text-muted-foreground">/hr</span>
                                </div>
                              </div>
                              {/* Show individual entries in group with checkboxes */}
                              <details className="mt-2" open>
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Select individual entries
                                </summary>
                                <div className="mt-2 space-y-2 pl-4 border-l-2 dark:border-border">
                                  {group.entries.map((entry) => (
                                    <div key={entry.id} className="flex items-start gap-2">
                                      <Checkbox
                                        checked={selectedEntries.has(entry.id)}
                                        onCheckedChange={() => toggleEntry(entry.id, group.groupKey)}
                                        className="mt-0.5"
                                      />
                                      <div className="text-xs text-muted-foreground flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-foreground">
                                            {entry.user.displayName || entry.user.name}
                                          </span>
                                          <span>•</span>
                                          <span>{formatDate(entry.startedAt)}</span>
                                          <span>•</span>
                                          <span>
                                            {new Date(entry.startedAt).toLocaleTimeString('en-US', {
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              hour12: true,
                                            })}
                                          </span>
                                          <span>→</span>
                                          <span>
                                            {entry.stoppedAt &&
                                              new Date(entry.stoppedAt).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                              })}
                                          </span>
                                          <span>•</span>
                                          <span>{formatDuration(entry.durationSeconds)}</span>
                                        </div>
                                        {entry.note && (
                                          <div className="mt-1 text-foreground/70">{entry.note}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                            <div className="text-right pt-1">
                              <div className="text-base font-semibold">
                                {formatCurrency(amount * 100)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Manual Line Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Manual Line Items</h2>
              <p className="text-sm text-muted-foreground">
                Add custom items not tied to time entries
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No manual items added
            </div>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 p-4 border dark:border-border rounded-lg"
                >
                  <div className="col-span-5">
                    <Label htmlFor={`description-${item.id}`}>Description *</Label>
                    <Input
                      id={`description-${item.id}`}
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, 'description', e.target.value)
                      }
                      placeholder="Item description"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`rate-${item.id}`}>Rate ($)</Label>
                    <Input
                      id={`rate-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rateCents}
                      onChange={(e) =>
                        updateLineItem(item.id, 'rateCents', e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-2 flex items-end">
                    <div className="flex-1">
                      <Label>Amount</Label>
                      <div className="text-sm font-medium mt-2">
                        {formatCurrency(
                          (parseFloat(item.quantity) || 0) *
                            (parseFloat(item.rateCents) || 0) *
                            100
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(calculateSubtotal() * 100)}</span>
              </div>
              {parseFloat(taxRatePercent) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({taxRatePercent}%)
                  </span>
                  <span>{formatCurrency(calculateTax() * 100)}</span>
                </div>
              )}
              <div className="border-t dark:border-border pt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal() * 100)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || !clientId}>
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
          <Link href="/invoices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
