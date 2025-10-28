// Description: API route to generate and export invoice as PDF
// Usage: GET /api/invoices/{invoiceId}/pdf

import { query } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await ctx.params;

    // Fetch invoice with all related data
    const result = await query(
      `
      SELECT
        i.*,
        to_jsonb(c) AS client,
        to_jsonb(t) AS team,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', ii.id,
              'description', ii.description,
              'quantity', ii.quantity,
              'rate_cents', ii.rate_cents,
              'amount_cents', ii.amount_cents
            )
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN teams t ON t.id = i.team_id
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      WHERE i.id = $1
      GROUP BY i.id, c.id, t.id
      `,
      [invoiceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = result.rows[0];

    // Generate PDF
    // @ts-expect-error - renderToStream type is overly restrictive, but this works at runtime
    const stream = await renderToStream(React.createElement(InvoicePDF, { invoice }));

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', message: error.message },
      { status: 500 }
    );
  }
}
