import { Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

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

export class ApiService {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
    this.getToken = getToken;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async getFormHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Vendor endpoints
  async getVendors(): Promise<ApiVendor[]> {
    const response = await fetch(`${this.baseUrl}/vendor`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vendors: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.vendors ?? [];
  }

  async getVendor(id: string): Promise<ApiVendor> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vendor: ${response.status}`);
    }
    
    return response.json();
  }

  async createVendor(vendorData: Partial<ApiVendor>): Promise<ApiVendor> {
    const response = await fetch(`${this.baseUrl}/vendor`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(vendorData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create vendor: ${response.status}`);
    }
    
    return response.json();
  }

  async updateVendor(id: string, vendorData: Partial<ApiVendor>): Promise<ApiVendor> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(vendorData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update vendor: ${response.status}`);
    }
    
    return response.json();
  }

  async deleteVendor(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vendor/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete vendor: ${response.status}`);
    }
  }

  // Invoice endpoints
  async getAllInvoices(): Promise<ApiInvoice[]> {
    const response = await fetch(`${this.baseUrl}/vendor/invoice/all`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch invoices: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.invoices ?? [];
  }

  async getVendorInvoices(vendorId: string): Promise<ApiInvoice[]> {
    const response = await fetch(`${this.baseUrl}/vendor/${vendorId}/invoice`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vendor invoices: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.invoices ?? [];
  }

  async getInvoice(vendorId: string, invoiceId: string): Promise<ApiInvoice> {
    const response = await fetch(`${this.baseUrl}/vendor/${vendorId}/invoice/${invoiceId}`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.status}`);
    }
    
    return response.json();
  }

  async createInvoice(vendorId: string, invoiceData: Partial<ApiInvoice>): Promise<ApiInvoice> {
    const response = await fetch(`${this.baseUrl}/vendor/${vendorId}/invoice`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create invoice: ${response.status}`);
    }
    
    return response.json();
  }

  async updateInvoice(vendorId: string, invoiceId: string, invoiceData: Partial<ApiInvoice>): Promise<ApiInvoice> {
    const response = await fetch(`${this.baseUrl}/vendor/${vendorId}/invoice/${invoiceId}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(invoiceData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update invoice: ${response.status}`);
    }
    
    return response.json();
  }

  async deleteInvoice(vendorId: string, invoiceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/vendor/${vendorId}/invoice/${invoiceId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete invoice: ${response.status}`);
    }
  }

  // Upload endpoint
  async uploadInvoice(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/vendor/invoice/upload`, {
      method: 'POST',
      headers: await this.getFormHeaders(),
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to upload invoice: ${response.status} ${errorText}`);
    }
    
    return response.json();
  }

  // Performance data for charts
  async getPerformanceData(): Promise<PerformanceData[]> {
    const response = await fetch(`${this.baseUrl}/vendor/performance`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch performance data: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.performance ?? [];
  }
}

// Global API service instance
let apiServiceInstance: ApiService | null = null;

export function getApiService(getToken: () => Promise<string | null>): ApiService {
  if (!apiServiceInstance) {
    apiServiceInstance = new ApiService(getToken);
  }
  return apiServiceInstance;
}
