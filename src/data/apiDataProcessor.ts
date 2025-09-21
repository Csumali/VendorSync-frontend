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

    // Projected savings: calculate actual savings from early pay discounts
    const projectedSavings = this.invoices.reduce((sum, invoice) => {
      if (invoice.earlyPayDiscount && invoice.earlyPayDiscount > 0) {
        // Calculate savings as percentage of total amount
        const savings = (invoice.totalAmount * invoice.earlyPayDiscount) / 100;
        return sum + savings;
      }
      return sum;
    }, 0);

    // Total spend is now managed by global variable, so we return 0 here
    // The actual total spend will be managed by the global variable in dataService
    const totalSpend = 0;

    // Average invoice amount (based on paid invoices only)
    const paidInvoices = this.invoices.filter(invoice => invoice.status === 'paid' || invoice.paidDate);
    // For average calculation, we'll calculate it from the actual paid invoices
    const actualTotalSpend = paidInvoices.reduce((sum, invoice) => {
      const amount = Number(invoice.totalAmount);
      return Number.isFinite(amount) && amount >= 0 ? sum + amount : sum;
    }, 0);
    const averageInvoiceAmount = paidInvoices.length > 0 ? actualTotalSpend / paidInvoices.length : 0;

    // Validate final total spend value
    const validatedTotalSpend = Number.isFinite(totalSpend) && totalSpend >= 0 && totalSpend <= 1000000000 
      ? totalSpend 
      : 0; // Cap at $1B and default to 0 for invalid values


    return {
      totalVendors,
      activeContracts,
      upcomingPayments,
      projectedSavings: Math.round(projectedSavings),
      totalSpend: Math.round(validatedTotalSpend),
      averageInvoiceAmount: Math.round(averageInvoiceAmount)
    };
  }

  // Generate vendor data with calculated metrics
  public getVendors(): Vendor[] {
    const vendorMap = new Map<string, Vendor>();

    this.vendors.forEach(apiVendor => {
      // Get all invoices for this vendor
      const vendorInvoices = this.invoices.filter(invoice => invoice.vendorId === apiVendor.id);
      
      // Calculate metrics (only paid invoices contribute to spend)
      const totalSpend = vendorInvoices.reduce((sum, invoice) => {
        if (invoice.status === 'paid' || invoice.paidDate) {
          return sum + invoice.totalAmount;
        }
        return sum;
      }, 0);
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
      
      // Find vendor name - try multiple sources
      let vendorName = 'Unknown Vendor';
      
      // First, try to get vendor name from the invoice object itself (if API includes it)
      if (invoice.vendor?.name) {
        vendorName = invoice.vendor.name;
      } else {
        // Fallback to vendor lookup
        const vendor = this.vendors.find(v => v.id === invoice.vendorId);
        if (vendor?.name) {
          vendorName = vendor.name;
        } else {
          // Last resort: use vendor ID
          vendorName = `Vendor ${invoice.vendorId}`;
        }
      }
      
      // Determine event type based on payment terms and dates
      let type: 'soon' | 'due' | 'save' | 'future' = 'due';
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (invoice.earlyPayDiscount && invoice.earlyPayDiscount > 0) {
        type = 'save';
      } else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        type = 'soon';
      } else if (daysUntilDue > 7) {
        type = 'future';
      } else {
        // daysUntilDue < 0 (overdue)
        type = 'due';
      }
      
      // Create event label (truncate vendor name if too long)
      const label = vendorName.length > 8 ? vendorName.substring(0, 8) + '...' : vendorName;
      
      events.push({
        day,
        label,
        type,
        vendorId: invoice.vendorId,
        fullVendorName: vendorName
      });
    });
    
    // Remove duplicates and sort by day
    const uniqueEvents = events.reduce((acc, event) => {
      const existing = acc.find(e => e.day === event.day);
      if (!existing) {
        acc.push(event);
      } else {
        // If multiple events on same day, combine labels and vendor names
        existing.label = existing.label + ', ' + event.label;
        if (existing.fullVendorName && event.fullVendorName) {
          existing.fullVendorName = existing.fullVendorName + ', ' + event.fullVendorName;
        }
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

  public getMonthlyTotals(): { months: string[], amounts: number[] } {
    console.log('ApiDataProcessor: getMonthlyTotals called, total invoices:', this.invoices.length);
    
    // Get the last 12 months
    const now = new Date();
    const months: string[] = [];
    const amounts: number[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push(monthName);
      
      // Calculate total amount for this month from PAID invoices only
      const paidInvoices = this.invoices.filter(invoice => {
        // Only include paid invoices
        if (invoice.status !== 'paid' && !invoice.paidDate) {
          return false;
        }
        
        // Use paidDate if available, otherwise use invoice date for paid invoices
        const paymentDate = invoice.paidDate ? new Date(invoice.paidDate) : new Date(invoice.date);
        return paymentDate.getFullYear() === date.getFullYear() && 
               paymentDate.getMonth() === date.getMonth();
      });
      
      const monthTotal = paidInvoices.reduce((sum, invoice) => {
        // Use paidAmount if available, otherwise use totalAmount
        const amount = invoice.paidAmount ? Number(invoice.paidAmount) : Number(invoice.totalAmount);
        return Number.isFinite(amount) && amount >= 0 ? sum + amount : sum;
      }, 0);
      
      console.log(`ApiDataProcessor: ${monthName} - ${paidInvoices.length} paid invoices, total: $${monthTotal}`);
      amounts.push(Math.round(monthTotal));
    }
    
    console.log('ApiDataProcessor: Final monthly totals:', { months, amounts });
    return { months, amounts };
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
