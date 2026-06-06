/**
 * PDF Generator using Puppeteer
 * Generates PDFs for Purchase Orders and Invoices
 */

const puppeteer = require('puppeteer');

function formatCurrency(amount) {
  return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generatePOHTML(po) {
  const lineItemsHTML = (po.line_items || []).map(item => `
    <tr>
      <td>${item.item_name}</td>
      <td>${item.description || '-'}</td>
      <td>${item.hsn_code || '-'}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
      <td style="text-align:right">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: white; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: 800; color: #6366f1; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 28px; font-weight: 800; color: #1a1a2e; }
    .doc-title p { color: #6366f1; font-size: 14px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .info-box { background: #f8f9ff; border: 1px solid #e0e3ff; border-radius: 8px; padding: 15px; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; font-weight: 700; }
    .info-box p { margin: 3px 0; color: #333; }
    .info-box .label { color: #888; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #6366f1; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #f8f9ff; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
    .total-row.grand { font-weight: 800; font-size: 16px; color: #6366f1; border-top: 2px solid #6366f1; border-bottom: none; padding-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; }
    .signature-line { border-top: 1px solid #333; width: 180px; margin: 40px auto 5px; }
    .terms { font-size: 11px; color: #888; margin-top: 20px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-sent { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">VendorBridge ERP</div>
      <p style="color:#888; font-size:12px; margin-top:5px">Procurement Management System</p>
    </div>
    <div class="doc-title">
      <h1>PURCHASE ORDER</h1>
      <p>${po.po_number}</p>
      <span class="badge badge-${po.status?.toLowerCase() || 'draft'}">${(po.status || 'DRAFT').toUpperCase()}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Buyer Details</h3>
      <p><strong>${po.created_by_name || 'N/A'}</strong></p>
      <p style="color:#888; font-size:11px">Procurement Officer</p>
      <p class="label">Date</p>
      <p>${formatDate(po.created_at)}</p>
    </div>
    <div class="info-box">
      <h3>Vendor Details</h3>
      <p><strong>${po.vendor_name}</strong></p>
      ${po.vendor_gstin ? `<p>GSTIN: ${po.vendor_gstin}</p>` : ''}
      ${po.vendor_address ? `<p>${po.vendor_address}</p>` : ''}
      ${po.vendor_email ? `<p>${po.vendor_email}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>RFQ Reference</h3>
      <p>${po.rfq_number || 'Direct PO'}</p>
      <p class="label">${po.rfq_title || ''}</p>
    </div>
    <div class="info-box">
      <h3>Terms & Conditions</h3>
      <p style="font-size:12px">${po.terms || 'Standard terms apply.'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Name</th>
        <th>Description</th>
        <th>HSN Code</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(po.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>GST (18%)</span>
        <span>${formatCurrency(po.tax_amount)}</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL</span>
        <span>${formatCurrency(po.total_amount)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="signature-box">
      <div class="signature-line"></div>
      <p><strong>Authorized Signatory</strong></p>
      <p style="font-size:11px; color:#888">Procurement Officer</p>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <p><strong>Vendor Acceptance</strong></p>
      <p style="font-size:11px; color:#888">${po.vendor_name}</p>
    </div>
  </div>

  <p class="terms">This is a computer-generated document. Generated on ${formatDate(new Date())} by VendorBridge ERP.</p>
</body>
</html>`;
}

function generateInvoiceHTML(invoice) {
  const lineItemsHTML = (invoice.line_items || []).map(item => `
    <tr>
      <td>${item.item_name}</td>
      <td>${item.description || '-'}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
      <td style="text-align:right">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  const cgst = parseFloat(invoice.tax_amount) / 2;
  const sgst = parseFloat(invoice.tax_amount) / 2;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: white; padding: 40px; font-size: 13px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-info h1 { font-size: 22px; font-weight: 800; }
    .company-info p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 28px; font-weight: 800; letter-spacing: 2px; }
    .invoice-meta .number { font-size: 16px; opacity: 0.9; margin-top: 4px; }
    .status-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 6px; border: 1px solid rgba(255,255,255,0.4); }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px; }
    .info-box { background: #f8f9ff; border: 1px solid #e0e3ff; border-radius: 8px; padding: 15px; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; font-weight: 700; }
    .info-box p { margin: 3px 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #f8f9ff; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 320px; background: #f8f9ff; border: 1px solid #e0e3ff; border-radius: 8px; padding: 15px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
    .total-row.grand { font-weight: 800; font-size: 16px; color: white; background: #6366f1; margin: 10px -15px -15px; padding: 12px 15px; border-radius: 0 0 8px 8px; border-bottom: none; }
    .bank-details { margin-top: 25px; background: #f8f9ff; border: 1px solid #e0e3ff; border-radius: 8px; padding: 15px; }
    .bank-details h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; font-weight: 700; }
    .footer { margin-top: 25px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
    .overdue { color: #dc2626; font-weight: 700; }
    .paid { color: #059669; font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${invoice.org_name || 'VendorBridge ERP'}</h1>
      ${invoice.org_gstin ? `<p>GSTIN: ${invoice.org_gstin}</p>` : ''}
      ${invoice.org_address ? `<p>${invoice.org_address}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <div class="number">${invoice.invoice_number}</div>
      <div class="status-badge">${(invoice.status || 'DRAFT').toUpperCase()}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Bill To</h3>
      <p><strong>${invoice.vendor_name}</strong></p>
      ${invoice.vendor_gstin ? `<p>GSTIN: ${invoice.vendor_gstin}</p>` : ''}
      ${invoice.vendor_address ? `<p style="font-size:11px">${invoice.vendor_address}</p>` : ''}
      ${invoice.vendor_email ? `<p>${invoice.vendor_email}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Invoice Details</h3>
      <p><span style="color:#888">Invoice Date:</span> <strong>${formatDate(invoice.invoice_date)}</strong></p>
      <p><span style="color:#888">Due Date:</span> <strong class="${invoice.status === 'OVERDUE' ? 'overdue' : ''}">${formatDate(invoice.due_date)}</strong></p>
      <p><span style="color:#888">PO Number:</span> <strong>${invoice.po_number}</strong></p>
    </div>
    <div class="info-box">
      <h3>Payment Status</h3>
      <p style="font-size:18px; font-weight:800;" class="${invoice.status === 'PAID' ? 'paid' : invoice.status === 'OVERDUE' ? 'overdue' : ''}">${(invoice.status || 'DRAFT').toUpperCase()}</p>
      <p style="color:#888; font-size:12px; margin-top:8px">Amount Due</p>
      <p style="font-size:16px; font-weight:800; color:#6366f1">${formatCurrency(invoice.total_amount)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item / Service</th>
        <th>Description</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>CGST (9%)</span>
        <span>${formatCurrency(cgst)}</span>
      </div>
      <div class="total-row">
        <span>SGST (9%)</span>
        <span>${formatCurrency(sgst)}</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL DUE</span>
        <span>${formatCurrency(invoice.total_amount)}</span>
      </div>
    </div>
  </div>

  ${invoice.bank_details ? `
  <div class="bank-details">
    <h3>Bank / Payment Details</h3>
    <p>${invoice.bank_details}</p>
  </div>` : ''}

  <div class="footer">
    <p>Thank you for your business! Please make payment before ${formatDate(invoice.due_date)}.</p>
    <p style="margin-top:5px">Generated by VendorBridge ERP on ${formatDate(new Date())}</p>
  </div>
</body>
</html>`;
}

async function generatePDF(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });
    return buffer;
  } finally {
    if (browser) await browser.close();
  }
}

async function generatePOPDF(po) {
  const html = generatePOHTML(po);
  return generatePDF(html);
}

async function generateInvoicePDF(invoice) {
  const html = generateInvoiceHTML(invoice);
  return generatePDF(html);
}

module.exports = { generatePOPDF, generateInvoicePDF, generatePOHTML, generateInvoiceHTML };
