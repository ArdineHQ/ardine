'use client';

import { use, useState, Fragment, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { useAuth, useCanAccessInvoices } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit, Trash2, ChevronDown, ChevronRight, Clock, Plus, X, FileDown, Send, Link2, Check, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GET_INVOICE_QUERY = gql(`
  query GetInvoice($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      status
      issuedDate
      dueDate
      subtotalCents
      taxRatePercent
      taxAmountCents
      totalCents
      notes
      team {
        id
        name
        billingAddress
      }
      client {
        id
        name
        email
        billingAddress
      }
      items {
        id
        description
        quantity
        rateCents
        amountCents
        timeEntryId
        timeEntries {
          id
          note
          startedAt
          stoppedAt
          durationSeconds
          user {
            id
            name
            displayName
          }
          project {
            id
            name
          }
          task {
            id
            name
          }
        }
      }
      createdAt
      updatedAt
    }
  }
`);

const DELETE_INVOICE_MUTATION = gql(`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`);

const MARK_PAID_MUTATION = gql(`
  mutation MarkInvoicePaid($id: ID!) {
    markInvoicePaid(id: $id) {
      id
      status
    }
  }
`);

const MARK_SENT_MUTATION = gql(`
  mutation MarkInvoiceSent($id: ID!) {
    markInvoiceSent(id: $id) {
      id
      status
    }
  }
`);

const CANCEL_INVOICE_MUTATION = gql(`
  mutation CancelInvoice($id: ID!) {
    cancelInvoice(id: $id) {
      id
      status
    }
  }
`);

const GET_NEW_TIME_ENTRIES_QUERY = gql(`
  query GetNewTimeEntriesForInvoice($teamId: ID!, $clientId: ID!, $since: DateTime!) {
    timeEntries(
      teamId: $teamId
      clientId: $clientId
      from: $since
      uninvoicedOnly: true
      billable: true
      limit: 100
    ) {
      nodes {
        id
        note
        startedAt
        stoppedAt
        durationSeconds
        hourlyRateCents
        user {
          id
          name
          displayName
        }
        project {
          id
          name
          code
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

const ADD_INVOICE_ITEM_MUTATION = gql(`
  mutation AddInvoiceItemToExisting($invoiceId: ID!, $input: InvoiceItemInput!) {
    addInvoiceItem(invoiceId: $invoiceId, input: $input) {
      id
      description
      quantity
      rateCents
      amountCents
    }
  }
`);

const ADD_TIME_ENTRIES_TO_ITEM_MUTATION = gql(`
  mutation AddTimeEntriesToInvoiceItem($invoiceItemId: ID!, $timeEntryIds: [ID!]!) {
    addTimeEntriesToInvoiceItem(invoiceItemId: $invoiceItemId, timeEntryIds: $timeEntryIds)
  }
`);

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const router = useRouter();
  const { currentTeam } = useAuth();
  const canAccessInvoices = useCanAccessInvoices();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showNewEntriesModal, setShowNewEntriesModal] = useState(false);
  const [selectedNewEntries, setSelectedNewEntries] = useState<Set<string>>(new Set());

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
  const [dismissedInvoices, setDismissedInvoices] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Load dismissed invoices from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissedInvoiceAlerts');
      if (stored) {
        setDismissedInvoices(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load dismissed invoices:', err);
    }
  }, []);

  const [result, refetch] = useQuery({
    query: GET_INVOICE_QUERY,
    variables: { id: invoiceId },
  });

  const [, deleteInvoiceMutation] = useMutation(DELETE_INVOICE_MUTATION);
  const [, markPaidMutation] = useMutation(MARK_PAID_MUTATION);
  const [, markSentMutation] = useMutation(MARK_SENT_MUTATION);
  const [, cancelInvoiceMutation] = useMutation(CANCEL_INVOICE_MUTATION);
  const [, addInvoiceItemMutation] = useMutation(ADD_INVOICE_ITEM_MUTATION);
  const [, addTimeEntriesToItemMutation] = useMutation(ADD_TIME_ENTRIES_TO_ITEM_MUTATION);

  const { data, fetching, error } = result;
  const invoice = data?.invoice;

  // Query for new time entries if invoice is draft
  const [newEntriesResult, refetchNewEntries] = useQuery({
    query: GET_NEW_TIME_ENTRIES_QUERY,
    variables: {
      teamId: currentTeam?.id || '',
      clientId: invoice?.client.id || '',
      since: invoice?.createdAt || '',
    },
    pause: !invoice || invoice.status !== 'draft' || !currentTeam?.id,
  });

  const newTimeEntries = (newEntriesResult.data?.timeEntries.nodes || []).filter(
    (entry: any) => entry.stoppedAt
  );

  const toggleItemExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'sent':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      const result = await deleteInvoiceMutation({ id: invoiceId });
      if (!result.error) {
        router.push('/invoices');
      }
    }
  };

  const handleMarkPaid = async () => {
    const result = await markPaidMutation({ id: invoiceId });
    if (!result.error) {
      refetch({ requestPolicy: 'network-only' });
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this invoice?')) {
      const result = await cancelInvoiceMutation({ id: invoiceId });
      if (!result.error) {
        refetch({ requestPolicy: 'network-only' });
      }
    }
  };

  const handleDismissAlert = () => {
    try {
      const newDismissed = new Set(dismissedInvoices);
      newDismissed.add(invoiceId);
      setDismissedInvoices(newDismissed);
      localStorage.setItem('dismissedInvoiceAlerts', JSON.stringify(Array.from(newDismissed)));
    } catch (err) {
      console.error('Failed to save dismissed invoice:', err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  const handleCopyPublicUrl = async () => {
    const publicUrl = `${window.location.origin}/invoices/public/${invoiceId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy URL to clipboard');
    }
  };

  const handleSend = async () => {
    // Mark invoice as sent if it's currently a draft
    if (invoice?.status === 'draft') {
      const result = await markSentMutation({ id: invoiceId });
      if (!result.error) {
        refetch({ requestPolicy: 'network-only' });
      }
    }
    // Open the send modal
    setShowSendModal(true);
  };

  const handleAddNewEntries = async () => {
    if (selectedNewEntries.size === 0) {
      alert('Please select at least one time entry to add');
      return;
    }

    try {
      // Group entries by project/task/rate (same logic as new invoice)
      const selectedEntries = newTimeEntries.filter((entry: any) =>
        selectedNewEntries.has(entry.id)
      );

      // Group by project, task, and rate
      const grouped = selectedEntries.reduce((acc: any, entry: any) => {
        const rate =
          entry.task?.hourlyRateCents ||
          entry.project?.defaultHourlyRateCents ||
          entry.hourlyRateCents ||
          0;
        const groupKey = `${entry.project.id}-${entry.task?.id || 'no-task'}-${rate}`;

        if (!acc[groupKey]) {
          acc[groupKey] = {
            projectName: entry.project.name,
            projectCode: entry.project.code,
            taskName: entry.task?.name,
            projectId: entry.project.id,
            taskId: entry.task?.id,
            rate,
            entries: [],
          };
        }
        acc[groupKey].entries.push(entry);
        return acc;
      }, {});

      // For each group, check if there's an existing line item we can add to
      for (const group of Object.values(grouped) as any[]) {
        const projectName = group.projectCode
          ? `[${group.projectCode}] ${group.projectName}`
          : group.projectName;
        const taskName = group.taskName ? ` - ${group.taskName}` : '';
        const description = `${projectName}${taskName}`;

        // Find existing item with matching description and rate
        const existingItem = invoice?.items.find(
          (item: any) =>
            item.description === description &&
            item.rateCents === group.rate
        );

        if (existingItem && existingItem.timeEntries && existingItem.timeEntries.length > 0) {
          // Add to existing line item using the new mutation
          const newEntryIds = group.entries.map((e: any) => e.id);

          await addTimeEntriesToItemMutation({
            invoiceItemId: existingItem.id,
            timeEntryIds: newEntryIds,
          });
        } else {
          // Create new line item
          const totalHours = group.entries.reduce(
            (sum: number, e: any) => sum + e.durationSeconds / 3600,
            0
          );

          await addInvoiceItemMutation({
            invoiceId,
            input: {
              timeEntryIds: group.entries.map((e: any) => e.id),
              description,
              quantity: totalHours,
              rateCents: group.rate,
            },
          });
        }
      }

      // Refetch both queries and close modal
      refetch({ requestPolicy: 'network-only' });
      refetchNewEntries({ requestPolicy: 'network-only' });
      setShowNewEntriesModal(false);
      setSelectedNewEntries(new Set());

      // Clear dismissed state for this invoice since user took action
      const newDismissed = new Set(dismissedInvoices);
      newDismissed.delete(invoiceId);
      setDismissedInvoices(newDismissed);
      localStorage.setItem('dismissedInvoiceAlerts', JSON.stringify(Array.from(newDismissed)));
    } catch (err: any) {
      alert('Failed to add time entries: ' + err.message);
    }
  };

  if (fetching && !invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">
          {error ? error.message : 'Invoice not found'}
        </p>
        <Link href="/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 dark:text-foreground">
              Invoice {invoice.invoiceNumber}
            </h1>
            <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
          </div>

          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <Link href={`/invoices/${invoiceId}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            <Button onClick={handleSend}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
            {(invoice.status === 'draft' || invoice.status === 'sent') && (
              <Button variant="outline" onClick={handleMarkPaid}>
                Mark as Paid
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(invoice.status === 'draft' || invoice.status === 'sent') && (
                  <DropdownMenuItem onClick={handleCancel}>
                    Cancel Invoice
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Alert for new time entries */}
      {invoice.status === 'draft' && newTimeEntries.length > 0 && !dismissedInvoices.has(invoiceId) && (
        <div className="mb-6 p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                New Time Entries Available
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                There {newTimeEntries.length === 1 ? 'is' : 'are'} {newTimeEntries.length} new{' '}
                {newTimeEntries.length === 1 ? 'time entry' : 'time entries'} for this client since this invoice was created.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4 mt-1">
              <Button
                size="sm"
                onClick={() => setShowNewEntriesModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Invoice
              </Button>
              <button
                onClick={handleDismissAlert}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                title="Dismiss this alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding new time entries */}
      {showNewEntriesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background dark:bg-card border dark:border-border rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-border">
              <h2 className="text-xl font-semibold">Add Time Entries to Invoice</h2>
              <button
                onClick={() => {
                  setShowNewEntriesModal(false);
                  setSelectedNewEntries(new Set());
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Select the time entries you want to add to this invoice:
              </p>
              <div className="space-y-3">
                {newTimeEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 border dark:border-border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedNewEntries.has(entry.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedNewEntries);
                        if (checked) {
                          newSelected.add(entry.id);
                        } else {
                          newSelected.delete(entry.id);
                        }
                        setSelectedNewEntries(newSelected);
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {entry.project.code ? `[${entry.project.code}] ` : ''}
                          {entry.project.name}
                        </span>
                        {entry.task && <span className="text-muted-foreground">- {entry.task.name}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span className="font-medium text-foreground">
                          {entry.user.displayName || entry.user.name}
                        </span>
                        <span>•</span>
                        <span>{formatDate(entry.startedAt)}</span>
                        <span>•</span>
                        <span>{formatTime(entry.startedAt)} → {formatTime(entry.stoppedAt)}</span>
                        <span>•</span>
                        <span>{formatDuration(entry.durationSeconds)}</span>
                      </div>
                      {entry.note && <div className="mt-1 text-xs text-foreground/70">{entry.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-6 border-t dark:border-border">
              <div className="text-sm text-muted-foreground">
                {selectedNewEntries.size} of {newTimeEntries.length} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewEntriesModal(false);
                    setSelectedNewEntries(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddNewEntries} disabled={selectedNewEntries.size === 0}>
                  Add {selectedNewEntries.size > 0 ? `(${selectedNewEntries.size})` : ''} to Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background dark:bg-card border dark:border-border rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b dark:border-border">
              <h2 className="text-xl font-semibold">Send Invoice</h2>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setUrlCopied(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  handleDownloadPDF();
                  setShowSendModal(false);
                }}
                className="w-full flex items-center gap-3 p-4 border dark:border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Download PDF</p>
                  <p className="text-sm text-muted-foreground">Download invoice as PDF file</p>
                </div>
              </button>

              <button
                onClick={handleCopyPublicUrl}
                className="w-full flex items-center gap-3 p-4 border dark:border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  {urlCopied ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Link2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{urlCopied ? 'URL Copied!' : 'Copy Public Link'}</p>
                  <p className="text-sm text-muted-foreground">
                    {urlCopied ? 'Link copied to clipboard' : 'Share public invoice URL'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details */}
      <div className="border dark:border-border rounded-lg bg-card dark:bg-card p-8 space-y-8">
        {/* From and Bill To - Side by Side */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl">
          {/* Team/Company Info */}
          {invoice.team && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                From
              </h2>
              <div>
                <p className="font-semibold text-lg">{invoice.team.name}</p>
                {invoice.team.billingAddress && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {invoice.team.billingAddress.street && (
                      <p>{invoice.team.billingAddress.street}</p>
                    )}
                    {(invoice.team.billingAddress.city ||
                      invoice.team.billingAddress.state ||
                      invoice.team.billingAddress.postalCode) && (
                      <p>
                        {invoice.team.billingAddress.city}
                        {invoice.team.billingAddress.state &&
                          `, ${invoice.team.billingAddress.state}`}
                        {invoice.team.billingAddress.postalCode &&
                          ` ${invoice.team.billingAddress.postalCode}`}
                      </p>
                    )}
                    {invoice.team.billingAddress.country && (
                      <p>{invoice.team.billingAddress.country}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Info */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
              Bill To
            </h2>
            <div>
              <p className="font-semibold text-lg">{invoice.client.name}</p>
              {invoice.client.email && (
                <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
              )}
              {invoice.client.billingAddress && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {invoice.client.billingAddress.street && (
                    <p>{invoice.client.billingAddress.street}</p>
                  )}
                  {(invoice.client.billingAddress.city ||
                    invoice.client.billingAddress.state ||
                    invoice.client.billingAddress.postalCode) && (
                    <p>
                      {invoice.client.billingAddress.city}
                      {invoice.client.billingAddress.state &&
                        `, ${invoice.client.billingAddress.state}`}
                      {invoice.client.billingAddress.postalCode &&
                        ` ${invoice.client.billingAddress.postalCode}`}
                    </p>
                  )}
                  {invoice.client.billingAddress.country && (
                    <p>{invoice.client.billingAddress.country}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Issued Date</p>
            <p className="text-base">{formatDate(invoice.issuedDate)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Due Date</p>
            <p className="text-base">{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-4">
            Items
          </h2>
          <div className="border dark:border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((item: any) => {
                  const hasTimeEntries = item.timeEntries && item.timeEntries.length > 0;
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <Fragment key={item.id}>
                      <tr>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {hasTimeEntries && (
                              <button
                                onClick={() => toggleItemExpanded(item.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <span>{item.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {formatCurrency(item.rateCents)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(item.amountCents)}
                        </td>
                      </tr>
                      {hasTimeEntries && isExpanded && (
                        <tr key={`${item.id}-details`}>
                          <td colSpan={4} className="px-4 py-3 bg-muted/30">
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                                Time Entries ({item.timeEntries.length})
                              </div>
                              {item.timeEntries.map((entry: any) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center gap-4 text-sm text-muted-foreground border-l-2 border-border pl-4 py-1"
                                >
                                  <div className="font-medium text-foreground min-w-[120px]">
                                    {entry.user.displayName || entry.user.name}
                                  </div>
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {new Date(entry.startedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 min-w-[180px]">
                                    <span>{formatTime(entry.startedAt)}</span>
                                    <span>→</span>
                                    <span>{entry.stoppedAt ? formatTime(entry.stoppedAt) : 'Running'}</span>
                                  </div>
                                  <div className="font-medium min-w-[60px]">
                                    {formatDuration(entry.durationSeconds)}
                                  </div>
                                  {entry.note && (
                                    <div className="flex-1 text-foreground/70">
                                      {entry.note}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotalCents)}</span>
            </div>
            {invoice.taxRatePercent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax ({invoice.taxRatePercent}%)
                </span>
                <span>{formatCurrency(invoice.taxAmountCents)}</span>
              </div>
            )}
            <div className="border-t dark:border-border pt-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
              Notes
            </h2>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
