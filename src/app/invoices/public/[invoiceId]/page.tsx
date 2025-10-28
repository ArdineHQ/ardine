'use client';

import { use, useState, Fragment } from 'react';
import { useQuery } from 'urql';
import { gql } from '@/lib/gql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Clock, FileDown } from 'lucide-react';

const GET_PUBLIC_INVOICE_QUERY = gql(`
  query GetPublicInvoice($id: ID!) {
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
        timeEntries {
          id
          note
          startedAt
          stoppedAt
          durationSeconds
        }
      }
    }
  }
`);

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [result] = useQuery({
    query: GET_PUBLIC_INVOICE_QUERY,
    variables: { id: invoiceId },
  });

  const { data, fetching, error } = result;
  const invoice = data?.invoice;

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

  if (fetching && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error ? error.message : 'Invoice not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 dark:text-foreground">
                Invoice {invoice.invoiceNumber}
              </h1>
              <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
            </div>

            <Button onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

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
                                    <div className="flex items-center gap-1 min-w-[120px]">
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
    </div>
  );
}
