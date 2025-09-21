'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import ScanContractModal from './ScanContractModal';

import DataConfirmationModal from './DataConfirmationModal';

import { getApiService } from '@/data/apiService';

export type OptimizationMode = 'Balanced' | 'Max Savings' | 'Cash Heavy';

type UploadExtract = {
  bill_to?: {
    company_name?: { text?: string };
    address?: { text?: string };
    contact?: {
      phone?: { text?: string | null };
      email?: { text?: string | null };
    };
  };
  invoice_details?: {
    invoice_number?: { text?: string | null };
    invoice_date?: { text?: string | null };
    due_date?: { text?: string | null };
    financial_data?: {
      total_amount?: { text?: string | null; numeric_value?: number | null };
      subtotal?: { text?: string | null; numeric_value?: number | null };
      tax?: { text?: string | null; numeric_value?: number | null };
      line_items?: Array<{
        description?: { text?: string | null };
        quantity?: number | null;
        amount?: { text?: string | null; numeric_value?: number | null };
      }>;
      payment_terms?: {
        terms_text?: string | null;
        standardized?: string | null;
        early_pay_discount?: {
          found?: boolean;
          text?: string;
          percentage?: number | null;
          days?: number | null;
        };
        late_fee?: {
          found?: boolean;
          percentage?: number | null;
          period?: string | null;
        };
      };
    };
  };
};

type VendorRow = {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
};

// Build the vendor POST body from the upload extract
function buildVendorBody(extract: UploadExtract) {
  return {
    name: (extract.bill_to?.company_name?.text ?? '').trim(),
    address: extract.bill_to?.address?.text ?? null,
    contact: extract.bill_to?.contact?.phone?.text ?? null,
    email: extract.bill_to?.contact?.email?.text ?? null,
  };
}

// Build the invoice POST body from the upload extract
function parseMoney(input?: { text?: string | null; numeric_value?: number | null }) {
  if (!input) return undefined;
  if (typeof input.numeric_value === 'number') return input.numeric_value;
  if (input.text) {
    const num = Number(String(input.text).replace(/[^\d.-]/g, ''));
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

function ymd(s?: string | null) {
  if (!s) return '';
  // already ISO? keep it; otherwise best-effort normalize
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return String(s);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildInvoiceBody(extract: UploadExtract) {
  console.log('Building invoice body from extract:', extract);
  
  const fin = extract.invoice_details?.financial_data;

  const invoiceNumber = extract.invoice_details?.invoice_number?.text ?? '';
  const date = ymd(extract.invoice_details?.invoice_date?.text ?? null);
  const dueDate = ymd(extract.invoice_details?.due_date?.text ?? null);

  const subtotal = parseMoney(fin?.subtotal) ?? 0;
  const totalAmount = parseMoney(fin?.total_amount) ?? subtotal;

  // Handle payment terms more robustly
  const paymentTerms = fin?.payment_terms?.terms_text?.trim() || 
                      fin?.payment_terms?.standardized?.trim() || 
                      fin?.payment_terms?.early_pay_discount?.text?.trim() || 
                      '';

  // Handle early pay discount more robustly
  const earlyPayDiscount = fin?.payment_terms?.early_pay_discount?.percentage ?? 
                          fin?.payment_terms?.early_pay_discount?.found ? 2 : 0; // Default 2% if found but no percentage

  const invoiceBody = {
    invoiceNumber,
    date,
    dueDate,
    subtotal,
    totalAmount,
    paymentTerms,
    earlyPayDiscount,
  };
  
  console.log('Built invoice body:', invoiceBody);
  return invoiceBody;
}

const norm = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function isSameVendor(a: VendorRow, target: { name: string; email: string }) {
  const aName = norm(a.name);
  const tName = norm(target.name);
  if (aName && tName && aName === tName) return true;

  const aEmail = norm(a.email ?? '');
  const tEmail = norm(target.email ?? '');
  if (aEmail && tEmail && aEmail === tEmail) return true;

  return false;
}


export default function Header({
  optimizationMode,
  onModeChange,
  onOpenSidebar,
}: {
  optimizationMode: OptimizationMode;
  onModeChange: (m: OptimizationMode) => void;
  onOpenSidebar: () => void;
}) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<UploadExtract | null>(null);
  const [busy, setBusy] = useState(false);

  const modes: OptimizationMode[] = ['Balanced', 'Max Savings', 'Cash Heavy'];
  const currentIndex = modes.indexOf(optimizationMode);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

  const handleModeClick = () => {
    const nextIndex = (currentIndex + 1) % modes.length;
    onModeChange(modes[nextIndex]);
  };

  const handleScanConfirm = async (file: File) => {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const apiService = getApiService(getToken);

      // 1) upload the document to extract data
      const extract: UploadExtract = await apiService.uploadInvoice(file);
      console.log('Extracted invoice data:', extract);

      // 2) Show confirmation modal with extracted data
      setExtractedData(extract);
      setIsScanModalOpen(false);
      setIsConfirmationModalOpen(true);

    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to process invoice.');
    } finally {
      setBusy(false);
    }
  };

  const handleDataConfirmation = async (confirmedData: UploadExtract) => {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const apiService = getApiService(getToken);

      // 2) create (or upsert) the vendor with confirmed data
      const vendorBody = buildVendorBody(confirmedData);
      console.log('Creating vendor with data:', vendorBody);
      if (!vendorBody.name) throw new Error('No vendor name detected from invoice');

      // 2a) Pull current vendors
      const existingVendors = await apiService.getVendors();

      // 2b) Try to find a match (by normalized name or email)
      const existing = existingVendors.find((v) => isSameVendor(v, { name: vendorBody.name, email: vendorBody.email ?? '' }));
      // Ensure email is null if empty string
      if (vendorBody.email === '') {
        vendorBody.email = null;
      }
      let vendorId: string;
      if (existing) {
        vendorId = existing.id;
      } else {
        // 2c) Create vendor
        const newVendor = await apiService.createVendor(vendorBody);
        vendorId = newVendor.id;
      }
      
      // 3) Check if invoice already exists before creating
      const invoiceBody = buildInvoiceBody(confirmedData);
      console.log('Creating invoice with data:', invoiceBody);
      console.log('Vendor ID for invoice creation:', vendorId);
      console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE);
      
      // Check for existing invoice with same invoice number
      const existingInvoices = await apiService.getVendorInvoices(vendorId);
      const existingInvoice = existingInvoices.find(inv => inv.invoiceNumber === invoiceBody.invoiceNumber);
      
      let invoiceAction = '';
      
      if (existingInvoice) {
        // Invoice already exists, ask user what to do
        const userChoice = confirm(
          `Invoice number "${invoiceBody.invoiceNumber}" already exists for this vendor.\n\n` +
          `Would you like to:\n` +
          `• OK - Update the existing invoice with new data\n` +
          `• Cancel - Keep the existing invoice unchanged`
        );
        
        if (userChoice) {
          await apiService.updateInvoice(vendorId, existingInvoice.id, invoiceBody);
          console.log('Updated existing invoice:', existingInvoice.id);
          invoiceAction = 'updated';
        } else {
          throw new Error('Invoice creation cancelled - duplicate invoice number');
        }
      } else {
        // Invoice doesn't exist, create new one
        await apiService.createInvoice(vendorId, invoiceBody);
        console.log('Created new invoice successfully');
        invoiceAction = 'created';
      }

      setIsConfirmationModalOpen(false);
      setExtractedData(null);
      
      if (invoiceAction === 'updated') {
        alert('✅ Invoice updated successfully with new data.');
      } else {
        alert('✅ Vendor and invoice created successfully.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to create vendor and invoice.');
    } finally {
      setBusy(false);
    }
  };

  const handleDataConfirmationCancel = () => {
    setIsConfirmationModalOpen(false);
    setExtractedData(null);
    // Optionally reopen the scan modal
    // setIsScanModalOpen(true);
  };

  const displayName = !isLoaded
    ? 'Loading…'
    : user
    ? user.fullName || user.username || user.emailAddresses[0]?.emailAddress || 'User'
    : 'Guest';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(10,16,23,0.55)] px-4 py-2 backdrop-blur">
      {/* Wraps on small screens */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Row 1: hamburger + search */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--chip)] text-lg md:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
            <input
              placeholder="Search vendors, contracts, terms…"
              className="h-[42px] w-full rounded-xl border border-[var(--border)] bg-[var(--card-2)] pl-9 pr-3 text-[var(--text)] outline-none"
            />
          </div>
        </div>

        {/* Row 2: action buttons */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            onClick={() => {
              const nextIndex = (currentIndex + 1) % modes.length;
              onModeChange(modes[nextIndex]);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm transition hover:brightness-110"
          >
            ⚙️ <span className="hidden sm:inline">Optimization:</span>
            <strong className="ml-1">{optimizationMode}</strong>
          </button>

          <button
            disabled={busy}
            onClick={() => setIsScanModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#184ba8] bg-[linear-gradient(180deg,#1f6fff,#125bdb)] px-3 py-2 text-sm transition hover:brightness-110 disabled:opacity-60"
          >
            📷 <span className="hidden sm:inline">Scan Contract</span>
          </button>

          <div className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm">
            👤 <span className="max-w-[12rem] truncate">{displayName}</span>
          </div>
        </div>
      </div>

      <ScanContractModal
        isOpen={isScanModalOpen}
        isConfirmModalOpen={false}
        onClose={() => setIsScanModalOpen(false)}
        onConfirm={handleScanConfirm}
        onDataConfirmation={() => {}}
      />

      <DataConfirmationModal
        isOpen={isConfirmationModalOpen}
        extractedData={extractedData}
        onConfirm={handleDataConfirmation}
        onCancel={handleDataConfirmationCancel}
      />
    </header>
  );
}