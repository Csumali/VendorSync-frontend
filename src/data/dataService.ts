import { ApiDataProcessor } from './apiDataProcessor';
import { getApiService } from './apiService';
import { Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

// Global data service instance
let apiDataProcessor: ApiDataProcessor | null = null;
let isInitialized = false;

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
    isInitialized = true;
    console.log(`API data service initialized with ${vendors.length} vendors and ${invoices.length} invoices`);
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
