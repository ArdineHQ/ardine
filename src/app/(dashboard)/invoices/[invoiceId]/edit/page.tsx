'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'urql';
import { useAuth, useCanAccessInvoices } from '@/lib/auth-context';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Clock, X } from 'lucide-react';

const GET_INVOICE_QUERY = gql(`
  query GetInvoiceForEdit($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      status
      issuedDate
      dueDate
      taxRatePercent
      notes
      client {
        id
        name
      }
      items {
        id
        description
        quantity
        rateCents
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
    }
  }
`);

const LIST_CLIENTS_QUERY = gql(`
  query ListClientsForInvoiceEdit($args: ListArgs!) {
    clients(args: $args) {
      nodes {
        id
        name
      }
      total
    }
  }
`);

const UPDATE_INVOICE_MUTATION = gql(`
  mutation UpdateInvoice($id: ID!, $input: InvoicePatch!) {
    updateInvoice(id: $id, input: $input) {
      id
      invoiceNumber
    }
  }
`);

const ADD_INVOICE_ITEM_MUTATION = gql(`
  mutation AddInvoiceItemOnEdit($invoiceId: ID!, $input: InvoiceItemInput!) {
    addInvoiceItem(invoiceId: $invoiceId, input: $input) {
      id
    }
  }
`);

const UPDATE_INVOICE_ITEM_MUTATION = gql(`
  mutation UpdateInvoiceItem($id: ID!, $input: InvoiceItemPatch!) {
    updateInvoiceItem(id: $id, input: $input) {
      id
    }
  }
`);

const REMOVE_INVOICE_ITEM_MUTATION = gql(`
  mutation RemoveInvoiceItem($id: ID!) {
    removeInvoiceItem(id: $id)
  }
`);

const REMOVE_TIME_ENTRY_FROM_INVOICE_MUTATION = gql(`
  mutation RemoveTimeEntryFromInvoice($invoiceId: ID!, $timeEntryId: ID!) {
    removeTimeEntryFromInvoice(invoiceId: $invoiceId, timeEntryId: $timeEntryId)
  }
`);

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rateCents: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
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
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [invoiceResult, refetchInvoice] = useQuery({
    query: GET_INVOICE_QUERY,
    variables: { id: invoiceId },
  });

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

  const [, updateInvoiceMutation] = useMutation(UPDATE_INVOICE_MUTATION);
  const [, addInvoiceItemMutation] = useMutation(ADD_INVOICE_ITEM_MUTATION);
  const [, updateInvoiceItemMutation] = useMutation(UPDATE_INVOICE_ITEM_MUTATION);
  const [, removeInvoiceItemMutation] = useMutation(REMOVE_INVOICE_ITEM_MUTATION);
  const [, removeTimeEntryMutation] = useMutation(REMOVE_TIME_ENTRY_FROM_INVOICE_MUTATION);

  const invoice = invoiceResult.data?.invoice;

  const toggleItemExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleRemoveTimeEntry = async (timeEntryId: string) => {
    if (!confirm('Remove this time entry from the invoice? This will make it available for other invoices.')) {
      return;
    }

    const result = await removeTimeEntryMutation({
      invoiceId,
      timeEntryId,
    });

    if (!result.error) {
      // Refetch the invoice to update the time entries list
      refetchInvoice({ requestPolicy: 'network-only' });
    } else {
      alert('Failed to remove time entry: ' + result.error.message);
    }
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

  // Pre-fill form when invoice loads
  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setIssuedDate(invoice.issuedDate.split('T')[0]);
      setDueDate(invoice.dueDate.split('T')[0]);
      setTaxRatePercent(invoice.taxRatePercent.toString());
      setNotes(invoice.notes || '');
      setLineItems(
        invoice.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity.toString(),
          rateCents: (item.rateCents / 100).toString(),
          isNew: false,
          isDeleted: false,
        }))
      );
    }
  }, [invoice]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `new-${Date.now()}`,
        description: '',
        quantity: '1',
        rateCents: '0',
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    const item = lineItems.find((i) => i.id === id);
    if (item?.isNew) {
      // Remove new items immediately
      setLineItems(lineItems.filter((i) => i.id !== id));
    } else {
      // Mark existing items for deletion
      setLineItems(
        lineItems.map((i) => (i.id === id ? { ...i, isDeleted: true } : i))
      );
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const calculateSubtotal = () => {
    return lineItems
      .filter((item) => !item.isDeleted)
      .reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rateCents) || 0;
        return sum + quantity * rate;
      }, 0);
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
      // Update invoice
      const invoiceUpdateResult = await updateInvoiceMutation({
        id: invoiceId,
        input: {
          invoiceNumber,
          issuedDate,
          dueDate,
          taxRatePercent: parseFloat(taxRatePercent) || 0,
          notes: notes || undefined,
        },
      });

      if (invoiceUpdateResult.error) {
        setError(invoiceUpdateResult.error.message);
        setIsSubmitting(false);
        return;
      }

      // Handle line items
      for (const item of lineItems) {
        if (item.isDeleted && !item.isNew) {
          // Delete existing items marked for deletion
          await removeInvoiceItemMutation({ id: item.id });
        } else if (item.isNew && !item.isDeleted) {
          // Add new items
          await addInvoiceItemMutation({
            invoiceId,
            input: {
              description: item.description,
              quantity: parseFloat(item.quantity) || 0,
              rateCents: Math.round(parseFloat(item.rateCents) * 100) || 0,
            },
          });
        } else if (!item.isNew && !item.isDeleted) {
          // Update existing items
          await updateInvoiceItemMutation({
            id: item.id,
            input: {
              description: item.description,
              quantity: parseFloat(item.quantity) || 0,
              rateCents: Math.round(parseFloat(item.rateCents) * 100) || 0,
            },
          });
        }
      }

      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
      setIsSubmitting(false);
    }
  };

  if (invoiceResult.fetching && !invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (invoiceResult.error || !invoice) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">
          {invoiceResult.error ? invoiceResult.error.message : 'Invoice not found'}
        </p>
        <Link href="/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground mb-4">
          Only draft invoices can be edited
        </p>
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="outline">Back to Invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href={`/invoices/${invoiceId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoice
          </Button>
        </Link>
        <h1 className="text-3xl font-bold dark:text-foreground">Edit Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client</Label>
              <div className="px-3 py-2 border dark:border-border rounded-lg bg-muted text-muted-foreground">
                {invoice.client.name}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Client cannot be changed after invoice creation
              </p>
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
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

        {/* Line Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {lineItems
              .filter((item) => !item.isDeleted)
              .map((item) => {
                const invoiceItem = invoice?.items?.find((i: any) => i.id === item.id);
                const hasTimeEntries = invoiceItem?.timeEntries && invoiceItem.timeEntries.length > 0;
                const isExpanded = expandedItems.has(item.id);

                return (
                  <div key={item.id} className="border dark:border-border rounded-lg">
                    <div className="grid grid-cols-12 gap-4 p-4">
                      <div className="col-span-5">
                        <Label htmlFor={`description-${item.id}`}>Description *</Label>
                        <div className="flex items-center gap-2">
                          {hasTimeEntries && (
                            <button
                              type="button"
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
                          <Input
                            id={`description-${item.id}`}
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(item.id, 'description', e.target.value)
                            }
                            placeholder="Item description"
                            required
                            className="flex-1"
                          />
                        </div>
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

                    {/* Time Entries Collapsible Section */}
                    {hasTimeEntries && isExpanded && invoiceItem && (
                      <div className="px-4 pb-4 pt-2 bg-muted/30 border-t dark:border-border">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                            Time Entries ({invoiceItem.timeEntries.length})
                          </div>
                          {invoiceItem.timeEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between gap-4 text-sm text-muted-foreground border-l-2 border-border pl-4 py-2 bg-background rounded"
                            >
                              <div className="flex items-center gap-4 flex-1">
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTimeEntry(entry.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link href={`/invoices/${invoiceId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
