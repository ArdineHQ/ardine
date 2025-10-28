import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    color: '#666',
  },
  value: {
    color: '#000',
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 40,
  },
  addressColumn: {
    flex: 1,
  },
  clientInfo: {
    marginTop: 5,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  clientDetail: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableCol1: {
    width: '50%',
  },
  tableCol2: {
    width: '16%',
    textAlign: 'right',
  },
  tableCol3: {
    width: '17%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '17%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#333',
  },
  statusBadge: {
    position: 'absolute',
    top: 40,
    right: 40,
    padding: '6 12',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

interface InvoicePDFProps {
  invoice: any;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
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

  const client = invoice.client;
  const team = invoice.team;
  const items = invoice.items || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{invoice.status}</Text>
        </View>

        {/* From and Bill To - Side by Side */}
        <View style={styles.addressRow}>
          {/* Team/Company Information */}
          {team && (
            <View style={styles.addressColumn}>
              <Text style={styles.sectionTitle}>From</Text>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{team.name}</Text>
                {team.billing_address && team.billing_address.street && (
                  <>
                    <Text style={styles.clientDetail}>
                      {team.billing_address.street}
                    </Text>
                    <Text style={styles.clientDetail}>
                      {team.billing_address.city}
                      {team.billing_address.state && `, ${team.billing_address.state}`}
                      {team.billing_address.postalCode && ` ${team.billing_address.postalCode}`}
                    </Text>
                    {team.billing_address.country && (
                      <Text style={styles.clientDetail}>
                        {team.billing_address.country}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Client Information */}
          <View style={styles.addressColumn}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              {client.email && (
                <Text style={styles.clientDetail}>{client.email}</Text>
              )}
              {client.billing_address && client.billing_address.street && (
                <>
                  <Text style={styles.clientDetail}>
                    {client.billing_address.street}
                  </Text>
                  <Text style={styles.clientDetail}>
                    {client.billing_address.city}
                    {client.billing_address.state && `, ${client.billing_address.state}`}
                    {client.billing_address.postalCode && ` ${client.billing_address.postalCode}`}
                  </Text>
                  {client.billing_address.country && (
                    <Text style={styles.clientDetail}>
                      {client.billing_address.country}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Issued Date:</Text>
            <Text style={styles.value}>{formatDate(invoice.issued_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol1, styles.tableHeaderText]}>
              Description
            </Text>
            <Text style={[styles.tableCol2, styles.tableHeaderText]}>
              Quantity
            </Text>
            <Text style={[styles.tableCol3, styles.tableHeaderText]}>
              Rate
            </Text>
            <Text style={[styles.tableCol4, styles.tableHeaderText]}>
              Amount
            </Text>
          </View>
          {items.map((item: any, index: number) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={styles.tableCol1}>{item.description}</Text>
              <Text style={styles.tableCol2}>{item.quantity}</Text>
              <Text style={styles.tableCol3}>
                {formatCurrency(item.rate_cents)}
              </Text>
              <Text style={styles.tableCol4}>
                {formatCurrency(item.amount_cents)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.subtotal_cents)}
            </Text>
          </View>
          {invoice.tax_rate_percent > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>
                Tax ({invoice.tax_rate_percent}%)
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.tax_amount_cents)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.total_cents)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default InvoicePDF;
