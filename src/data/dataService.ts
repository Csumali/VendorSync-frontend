import { ApiDataProcessor } from './apiDataProcessor';
import { getApiService } from './apiService';
import { Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

// Global data service instance
let apiDataProcessor: ApiDataProcessor | null = null;
let isInitialized = false;

// Global variable to track total spend
let globalTotalSpend = 0;

// Storage key for persisting total spend across page refreshes
const TOTAL_SPEND_STORAGE_KEY = 'vendorsync_total_spend';

// Initialize the data service with API data
export async function initializeDataService(getToken: () => Promise<string | null>): Promise<void> {
  if (isInitialized) return;
  
  try {
    const apiService = getApiService(getToken);
    
    // Load all data from API
    const [vendors, invoices, performanceData] = await Promise.all([
      apiService.getVendors(),
      apiService.getAllInvoices(),
      apiService.getPerformanceData().catch(() => []) // Performance data is optional
    ]);
    
    apiDataProcessor = new ApiDataProcessor(vendors, invoices, performanceData);
    
    // Initialize global total spend with current paid invoices from API
    const initialTotalSpend = invoices.reduce((sum, invoice) => {
      if (invoice.status === 'paid' || invoice.paidDate) {
        const amount = Number(invoice.totalAmount);
        
        if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) {
          return sum; // Skip invalid amounts
        }
        
        return sum + amount;
      }
      return sum;
    }, 0);
    
    // Always start with the calculated value from API (paid invoices only)
    // This ensures we start with 0 if no invoices are paid
    setGlobalTotalSpend(initialTotalSpend);
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize API data service:', error);
    throw error;
  }
}

// Get all vendors
export async function getVendors(): Promise<Vendor[]> {
  await ensureInitialized();
  return apiDataProcessor!.getVendors();
}

// Get all alerts
export async function getAlerts(): Promise<Alert[]> {
  await ensureInitialized();
  return apiDataProcessor!.getAlerts();
}

// Get all renewals
export async function getRenewals(): Promise<Renewal[]> {
  await ensureInitialized();
  return apiDataProcessor!.getRenewals();
}

// Get KPIs
export async function getKPIs(): Promise<KPIs> {
  await ensureInitialized();
  return apiDataProcessor!.getKPIs();
}

// Get calendar events
export async function getCalendarEvents(year?: number, month?: number): Promise<CalendarEvent[]> {
  await ensureInitialized();
  return apiDataProcessor!.getCalendarEvents(year, month);
}

// Get savings series for charts
export async function getSavingsSeries(): Promise<number[]> {
  await ensureInitialized();
  return apiDataProcessor!.getSavingsSeries();
}

// Get monthly totals for cash flow chart
export async function getMonthlyTotals(): Promise<{ months: string[], amounts: number[] }> {
  await ensureInitialized();
  return apiDataProcessor!.getMonthlyTotals();
}

// Helper function to ensure data service is initialized
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    // We need the getToken function, but it's not available in this context
    // This will be handled by the calling components
    throw new Error('Data service not initialized. Call initializeDataService first.');
  }
}

// Refresh data (useful for when new data is added via API)
export async function refreshData(getToken: () => Promise<string | null>): Promise<void> {
  isInitialized = false;
  apiDataProcessor = null;
  await initializeDataService(getToken);
}

// Get data processor instance (for advanced usage)
export function getDataProcessor(): ApiDataProcessor | null {
  return apiDataProcessor;
}

// Global total spend management functions
export function getGlobalTotalSpend(): number {
  return globalTotalSpend;
}

export function addToGlobalTotalSpend(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) {
    return;
  }
  globalTotalSpend += amount;
  // Persist to localStorage
  localStorage.setItem(TOTAL_SPEND_STORAGE_KEY, globalTotalSpend.toString());
}

export function subtractFromGlobalTotalSpend(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) {
    return;
  }
  globalTotalSpend -= amount;
  // Persist to localStorage
  localStorage.setItem(TOTAL_SPEND_STORAGE_KEY, globalTotalSpend.toString());
}

export function setGlobalTotalSpend(amount: number): void {
  // Validate the amount before setting
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
    globalTotalSpend = 0;
  } else {
    globalTotalSpend = amount;
  }
  // Persist to localStorage
  localStorage.setItem(TOTAL_SPEND_STORAGE_KEY, globalTotalSpend.toString());
}

export function resetGlobalTotalSpend(): void {
  globalTotalSpend = 0;
  localStorage.removeItem(TOTAL_SPEND_STORAGE_KEY);
}
