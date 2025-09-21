import { ApiVendor, ApiInvoice, PerformanceData, Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

export class ApiDataProcessor {
  private vendors: ApiVendor[] = [];
  private invoices: ApiInvoice[] = [];
  private performanceData: PerformanceData[] = [];

  constructor(vendors: ApiVendor[], invoices: ApiInvoice[], performanceData: PerformanceData[] = []) {
    this.vendors = vendors;
    this.invoices = invoices;
    this.performanceData = performanceData;
  }

  // Calculate KPIs based on API data
  public getKPIs(): KPIs {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Total vendors from database
    const totalVendors = this.vendors.length;

    // Active contracts: invoices where due date is still before current date
    const activeContracts = this.invoices.filter(invoice => {
      const dueDate = new Date(invoice.dueDate);
      return dueDate > now;
    }).length;

    // Upcoming payments: invoices due within 30 days
    const upcomingPayments = this.invoices.filter(invoice => {
      const dueDate = new Date(invoice.dueDate);
      return dueDate > now && dueDate <= thirtyDaysFromNow;
    }).length;

    // Projected savings: total of all invoice discounts
    const projectedSavings = this.invoices.reduce((sum, invoice) => {
      return sum + (invoice.earlyPayDiscount || 0);
    }, 0);

    // Total spend: sum of all invoice amounts
    const totalSpend = this.invoices.reduce((sum, invoice) => {
      return sum + invoice.totalAmount;
    }, 0);

    // Average invoice amount
    const averageInvoiceAmount = this.invoices.length > 0 ? totalSpend / this.invoices.length : 0;

    return {
      totalVendors,
      activeContracts,
      upcomingPayments,
      projectedSavings,
      totalSpend,
      averageInvoiceAmount
    };
  }

  // Generate vendor data with calculated metrics
  public getVendors(): Vendor[] {
    const vendorMap = new Map<string, Vendor>();

    this.vendors.forEach(apiVendor => {
      // Get all invoices for this vendor
      const vendorInvoices = this.invoices.filter(invoice => invoice.vendorId === apiVendor.id);
      
      // Calculate metrics
      const totalSpend = vendorInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const invoiceCount = vendorInvoices.length;
      
      // Calculate compliance status
      const compliance = this.calculateComplianceStatus(vendorInvoices);
      
      // Calculate next payment date
      const nextPay = this.calculateNextPaymentDate(vendorInvoices);
      
      // Calculate vendor score
      const score = this.calculateVendorScore(vendorInvoices, totalSpend);
      
      // Mock calculations for demo purposes (can be replaced with real calculations)
      const priceDelta = (Math.random() - 0.5) * 10; // -5% to +5%
      const onTimePercentage = Math.min(100, Math.max(70, 95 - Math.random() * 25));

      vendorMap.set(apiVendor.id, {
        name: apiVendor.name,
        spend: Math.round(totalSpend),
        priceDelta: Math.round(priceDelta * 10) / 10,
        onTime: Math.round(onTimePercentage),
        compliance,
        nextPay,
        score: Math.round(score),
        email: apiVendor.email || undefined,
        address: apiVendor.address || undefined,
        invoiceCount,
        lastInvoiceDate: vendorInvoices.length > 0 ? 
          vendorInvoices[vendorInvoices.length - 1].date : undefined
      });
    });

    return Array.from(vendorMap.values()).sort((a, b) => b.spend - a.spend);
  }

  // Generate alerts based on API data
  public getAlerts(): Alert[] {
    const alerts: Alert[] = [];
    const vendors = this.getVendors();
    const now = new Date();

    vendors.forEach(vendor => {
      const vendorInvoices = this.invoices.filter(invoice => 
        this.vendors.find(v => v.name === vendor.name)?.id === invoice.vendorId
      );

      // Price increase alert (mock calculation)
      if (vendor.priceDelta > 8) {
        alerts.push({
          level: 'danger',
          text: `${vendor.name} increased price by ${vendor.priceDelta}% (review before auto-renew)`
        });
      }

      // Compliance alerts
      if (vendor.compliance === 'Late Fee Risk') {
        alerts.push({
          level: 'warn',
          text: `${vendor.name} has late fee terms - review payment schedule`
        });
      }

      // Discount opportunity
      if (vendor.compliance === 'Discount Available') {
        alerts.push({
          level: 'ok',
          text: `Early-pay discount available: ${vendor.name}`
        });
      }

      // Payment due soon
      if (vendor.nextPay === 'Due Soon') {
        alerts.push({
          level: 'warn',
          text: `Payment due soon for ${vendor.name}`
        });
      }

      // Overdue payments
      const overdueInvoices = vendorInvoices.filter(invoice => {
        const dueDate = new Date(invoice.dueDate);
        return dueDate < now;
      });

      if (overdueInvoices.length > 0) {
        alerts.push({
          level: 'danger',
          text: `${vendor.name} has ${overdueInvoices.length} overdue payment(s)`
        });
      }
    });

    return alerts;
  }

  // Generate renewals based on API data
  public getRenewals(): Renewal[] {
    const renewals: Renewal[] = [];
    
    this.vendors.forEach(vendor => {
      // Mock renewal dates (3-12 months from now) - can be replaced with real contract data
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + Math.floor(Math.random() * 9) + 3);
      
      const statuses = ['Auto-renew', 'Negotiation', 'Review', 'Pending'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      renewals.push({
        contract: `${vendor.name} Contract 2024`,
        vendor: vendor.name,
        renews: renewalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status
      });
    });
    
    return renewals;
  }

  // Generate calendar events from invoice data
  public getCalendarEvents(year?: number, month?: number): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    
    this.invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const invoiceYear = dueDate.getFullYear();
      const invoiceMonth = dueDate.getMonth();
      const day = dueDate.getDate();
      
      // Filter by year and month if provided
      if (year !== undefined && invoiceYear !== year) {
        return;
      }
      if (month !== undefined && invoiceMonth !== month) {
        return;
      }
      
      // Find vendor name
      const vendor = this.vendors.find(v => v.id === invoice.vendorId);
      const vendorName = vendor?.name || 'Unknown Vendor';
      
      // Determine event type based on payment terms and dates
      let type: 'soon' | 'due' | 'save' = 'due';
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (invoice.earlyPayDiscount && invoice.earlyPayDiscount > 0) {
        type = 'save';
      } else if (daysUntilDue <= 7) {
        type = 'soon';
      }
      
      // Create event label (truncate vendor name if too long)
      const label = vendorName.length > 8 ? vendorName.substring(0, 8) + '...' : vendorName;
      
      events.push({
        day,
        label,
        type
      });
    });
    
    // Remove duplicates and sort by day
    const uniqueEvents = events.reduce((acc, event) => {
      const existing = acc.find(e => e.day === event.day);
      if (!existing) {
        acc.push(event);
      } else {
        // If multiple events on same day, combine labels
        existing.label = existing.label + ', ' + event.label;
      }
      return acc;
    }, [] as CalendarEvent[]);
    
    return uniqueEvents.sort((a, b) => a.day - b.day);
  }

  // Get savings series for charts
  public getSavingsSeries(): number[] {
    if (this.performanceData.length > 0) {
      // Use real performance data if available
      return this.performanceData.map(p => p.totalAmount);
    }
    
    // Fallback: generate 12 months of savings data based on projected savings
    const baseSavings = this.getKPIs().projectedSavings / 12;
    return Array.from({ length: 12 }, (_, i) => 
      Math.round(baseSavings * (1 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2))
    );
  }

  // Helper methods
  private calculateComplianceStatus(vendorInvoices: ApiInvoice[]): string {
    const hasLateFees = vendorInvoices.some(invoice => invoice.lateFee && invoice.lateFee > 0);
    const hasEarlyPayDiscount = vendorInvoices.some(invoice => invoice.earlyPayDiscount && invoice.earlyPayDiscount > 0);
    
    if (hasLateFees) {
      return 'Late Fee Risk';
    }
    
    if (hasEarlyPayDiscount) {
      return 'Discount Available';
    }
    
    return 'OK';
  }

  private calculateNextPaymentDate(vendorInvoices: ApiInvoice[]): string {
    if (vendorInvoices.length === 0) return 'No Payments';
    
    const now = new Date();
    const futureInvoices = vendorInvoices.filter(invoice => new Date(invoice.dueDate) > now);
    
    if (futureInvoices.length === 0) return 'No Future Payments';
    
    const nextDueDate = new Date(Math.min(...futureInvoices.map(invoice => new Date(invoice.dueDate).getTime())));
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 0) return 'Overdue';
    if (daysUntilDue <= 3) return 'Due Soon';
    
    return nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private calculateVendorScore(vendorInvoices: ApiInvoice[], totalSpend: number): number {
    let score = 75; // Base score
    
    // Adjust based on invoice count (more invoices = better relationship)
    score += Math.min(15, vendorInvoices.length * 2);
    
    // Adjust based on compliance
    const compliance = this.calculateComplianceStatus(vendorInvoices);
    if (compliance === 'Late Fee Risk') score -= 15;
    else if (compliance === 'Discount Available') score += 10;
    
    // Adjust based on spend (higher spend = more important)
    if (totalSpend > 10000) score += 10;
    else if (totalSpend < 1000) score -= 5;
    
    return Math.max(0, Math.min(100, score));
  }
}
