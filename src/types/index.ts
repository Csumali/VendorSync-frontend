// API Response Types
export interface ApiVendor {
  id: string;
  name: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: { id: string };
}

export interface ApiInvoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  subtotal: number;
  totalAmount: number;
  paymentTerms: string;
  earlyPayDiscount?: number;
  lateFee?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceData {
  month: string;
  totalAmount: number;
  vendorCount: number;
}

// Legacy JSON Invoice Data Structure (kept for backward compatibility)
export interface InvoiceData {
  vendor_information: {
    company_name: { text: string };
    address: { text: string };
    contact: {
      phone: { text: string };
      email: { text: string };
    };
  };
  invoice_details: {
    invoice_number: { text: string };
    invoice_date: { text: string };
    due_date: { text: string };
    financial_data: {
      total_amount: { text: string; numeric_value: number };
      line_items: Array<{
        description: { text: string };
        quantity: number;
        amount: { text: string; numeric_value: number };
      }>;
      subtotal: { text: string; numeric_value: number };
      tax: { text: string; numeric_value: number };
      shipping_handling: { text: string; numeric_value: number };
      payment_terms: {
        terms_text: string;
        standardized: string;
        early_pay_discount: {
          found: boolean;
          text: string;
          percentage: number | null;
          days: number | null;
        };
        late_fee: {
          found: boolean;
          percentage: number | null;
          period: string;
        };
      };
    };
  };
}

// Dashboard Data Structures (derived from JSON)
export interface Vendor {
  name: string;
  spend: number;
  priceDelta: number;
  onTime: number;
  compliance: string;
  nextPay: string;
  score: number;
  email?: string;
  address?: string;
  invoiceCount?: number;
  lastInvoiceDate?: string;
}

export interface Alert {
  level: 'danger' | 'warn' | 'ok';
  text: string;
}

export interface Renewal {
  contract: string;
  vendor: string;
  renews: string;
  status: string;
}

export interface KPIs {
  totalVendors: number;
  activeContracts: number;
  upcomingPayments: number;
  projectedSavings: number;
  totalSpend: number;
  averageInvoiceAmount: number;
}

export interface CalendarEvent {
  day: number;
  label: string;
  type: 'soon' | 'due' | 'save';
}

export type OptimizationMode = 'Balanced' | 'Max Savings' | 'Cash Heavy';
