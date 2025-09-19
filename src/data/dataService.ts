import { DataProcessor, loadInvoiceData } from './dataProcessor';
import { Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

// Global data service instance
let dataProcessor: DataProcessor | null = null;
let isInitialized = false;

// Initialize the data service
export async function initializeDataService(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const invoices = await loadInvoiceData();
    dataProcessor = new DataProcessor(invoices);
    isInitialized = true;
    console.log(`Data service initialized with ${invoices.length} invoices`);
  } catch (error) {
    console.error('Failed to initialize data service:', error);
    throw error;
  }
}

// Get all vendors
export async function getVendors(): Promise<Vendor[]> {
  await ensureInitialized();
  return dataProcessor!.getVendors();
}

// Get all alerts
export async function getAlerts(): Promise<Alert[]> {
  await ensureInitialized();
  return dataProcessor!.getAlerts();
}

// Get all renewals
export async function getRenewals(): Promise<Renewal[]> {
  await ensureInitialized();
  return dataProcessor!.getRenewals();
}

// Get KPIs
export async function getKPIs(): Promise<KPIs> {
  await ensureInitialized();
  return dataProcessor!.getKPIs();
}

// Get calendar events
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  await ensureInitialized();
  return dataProcessor!.getCalendarEvents();
}

// Get savings series for charts
export async function getSavingsSeries(): Promise<number[]> {
  await ensureInitialized();
  return dataProcessor!.getSavingsSeries();
}

// Helper function to ensure data service is initialized
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeDataService();
  }
}

// Refresh data (useful for when new JSON files are added)
export async function refreshData(): Promise<void> {
  isInitialized = false;
  dataProcessor = null;
  await initializeDataService();
}

// Get data processor instance (for advanced usage)
export function getDataProcessor(): DataProcessor | null {
  return dataProcessor;
}
