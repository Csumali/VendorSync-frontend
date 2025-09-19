import { InvoiceData, Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

// Utility functions for data processing
export class DataProcessor {
  private invoices: InvoiceData[] = [];
  private vendors: Map<string, Vendor> = new Map();
  private alerts: Alert[] = [];
  private renewals: Renewal[] = [];

  constructor(invoices: InvoiceData[]) {
    this.invoices = invoices;
    this.processInvoices();
  }

  private processInvoices() {
    // Group invoices by vendor
    const vendorInvoices = new Map<string, InvoiceData[]>();
    
    this.invoices.forEach(invoice => {
      const vendorName = invoice.vendor_information.company_name.text;
      if (!vendorInvoices.has(vendorName)) {
        vendorInvoices.set(vendorName, []);
      }
      vendorInvoices.get(vendorName)!.push(invoice);
    });

    // Process each vendor
    vendorInvoices.forEach((invoices, vendorName) => {
      const vendor = this.createVendorFromInvoices(vendorName, invoices);
      this.vendors.set(vendorName, vendor);
    });

    // Generate alerts and renewals
    this.generateAlerts();
    this.generateRenewals();
  }

  private createVendorFromInvoices(vendorName: string, invoices: InvoiceData[]): Vendor {
    const totalSpend = invoices.reduce((sum, invoice) => 
      sum + invoice.invoice_details.financial_data.total_amount.numeric_value, 0
    );
    
    const latestInvoice = invoices[invoices.length - 1];
    const invoiceDate = new Date(latestInvoice.invoice_details.invoice_date.text);
    const dueDate = new Date(latestInvoice.invoice_details.due_date.text);
    
    // Calculate on-time percentage (mock calculation)
    const onTimePercentage = Math.min(100, Math.max(70, 95 - Math.random() * 25));
    
    // Calculate price delta (mock calculation based on invoice amounts)
    const avgAmount = totalSpend / invoices.length;
    const priceDelta = (Math.random() - 0.5) * 10; // -5% to +5%
    
    // Calculate compliance status
    const compliance = this.calculateComplianceStatus(latestInvoice);
    
    // Calculate vendor score
    const score = this.calculateVendorScore(onTimePercentage, priceDelta, compliance);
    
    // Calculate next payment date
    const nextPay = this.calculateNextPaymentDate(dueDate);

    return {
      name: vendorName,
      spend: Math.round(totalSpend),
      priceDelta: Math.round(priceDelta * 10) / 10,
      onTime: Math.round(onTimePercentage),
      compliance,
      nextPay,
      score: Math.round(score),
      email: latestInvoice.vendor_information.contact.email.text,
      address: latestInvoice.vendor_information.address.text,
      invoiceCount: invoices.length,
      lastInvoiceDate: latestInvoice.invoice_details.invoice_date.text
    };
  }

  private calculateComplianceStatus(invoice: InvoiceData): string {
    const paymentTerms = invoice.invoice_details.financial_data.payment_terms;
    
    if (paymentTerms.late_fee.found) {
      return 'Late Fee Risk';
    }
    
    if (paymentTerms.early_pay_discount.found) {
      return 'Discount Available';
    }
    
    return 'OK';
  }

  private calculateVendorScore(onTime: number, priceDelta: number, compliance: string): number {
    let score = onTime;
    
    // Adjust for price changes
    if (priceDelta > 5) score -= 10;
    else if (priceDelta < -2) score += 5;
    
    // Adjust for compliance
    if (compliance === 'Late Fee Risk') score -= 15;
    else if (compliance === 'Discount Available') score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateNextPaymentDate(dueDate: Date): string {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 0) return 'Overdue';
    if (daysUntilDue <= 3) return 'Due Soon';
    
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private generateAlerts() {
    this.alerts = [];
    
    this.vendors.forEach(vendor => {
      // Price increase alert
      if (vendor.priceDelta > 8) {
        this.alerts.push({
          level: 'danger',
          text: `${vendor.name} increased price by ${vendor.priceDelta}% (review before auto-renew)`
        });
      }
      
      // Compliance alert
      if (vendor.compliance === 'Late Fee Risk') {
        this.alerts.push({
          level: 'warn',
          text: `${vendor.name} has late fee terms - review payment schedule`
        });
      }
      
      // Discount opportunity
      if (vendor.compliance === 'Discount Available') {
        this.alerts.push({
          level: 'ok',
          text: `Early-pay discount available: ${vendor.name}`
        });
      }
      
      // Payment due soon
      if (vendor.nextPay === 'Due Soon') {
        this.alerts.push({
          level: 'warn',
          text: `Payment due soon for ${vendor.name}`
        });
      }
    });
  }

  private generateRenewals() {
    this.renewals = [];
    
    this.vendors.forEach(vendor => {
      // Mock renewal dates (3-12 months from now)
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + Math.floor(Math.random() * 9) + 3);
      
      const statuses = ['Auto-renew', 'Negotiation', 'Review', 'Pending'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.renewals.push({
        contract: `${vendor.name} Contract 2024`,
        vendor: vendor.name,
        renews: renewalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status
      });
    });
  }

  public getVendors(): Vendor[] {
    return Array.from(this.vendors.values()).sort((a, b) => b.spend - a.spend);
  }

  public getAlerts(): Alert[] {
    return this.alerts;
  }

  public getRenewals(): Renewal[] {
    return this.renewals;
  }

  public getKPIs(): KPIs {
    const vendors = this.getVendors();
    const totalSpend = vendors.reduce((sum, vendor) => sum + vendor.spend, 0);
    const averageInvoiceAmount = this.invoices.length > 0 ? totalSpend / this.invoices.length : 0;
    
    // Calculate projected savings based on early pay discounts and optimization
    const projectedSavings = vendors.reduce((sum, vendor) => {
      if (vendor.compliance === 'Discount Available') {
        return sum + (vendor.spend * 0.02); // 2% discount assumption
      }
      return sum;
    }, 0);

    return {
      totalVendors: vendors.length,
      activeContracts: this.renewals.length,
      upcomingPayments: vendors.filter(v => v.nextPay !== 'Overdue').length,
      projectedSavings: Math.round(projectedSavings),
      totalSpend: Math.round(totalSpend),
      averageInvoiceAmount: Math.round(averageInvoiceAmount)
    };
  }

  public getCalendarEvents(): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const today = new Date();
    
    this.vendors.forEach(vendor => {
      if (vendor.nextPay !== 'Overdue') {
        const dueDate = new Date(vendor.lastInvoiceDate || today);
        const day = dueDate.getDate();
        
        let type: 'soon' | 'due' | 'save' = 'due';
        if (vendor.compliance === 'Discount Available') {
          type = 'save';
        } else if (vendor.nextPay === 'Due Soon') {
          type = 'soon';
        }
        
        events.push({
          day,
          label: vendor.name.substring(0, 8),
          type
        });
      }
    });
    
    return events;
  }

  public getSavingsSeries(): number[] {
    // Generate 12 months of savings data
    const baseSavings = this.getKPIs().projectedSavings / 12;
    return Array.from({ length: 12 }, (_, i) => 
      Math.round(baseSavings * (1 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2))
    );
  }
}

// Function to load and process JSON data from files
export async function loadInvoiceData(): Promise<InvoiceData[]> {
  try {
    // List of JSON files to load
    const invoiceFiles = [
      'invoice_001.json',
      'invoice_002.json', 
      'invoice_003.json',
      'invoice_004.json',
      'invoice_005.json'
    ];
    
    const invoices: InvoiceData[] = [];
    
    // Load each JSON file
    for (const filename of invoiceFiles) {
      try {
        const response = await fetch(`/data/${filename}`);
        if (response.ok) {
          const data: InvoiceData = await response.json();
          invoices.push(data);
        } else {
          console.warn(`Failed to load ${filename}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Error loading ${filename}:`, error);
      }
    }
    
    // If no files loaded successfully, return sample data
    if (invoices.length === 0) {
      console.log('No JSON files loaded, using sample data');
      return getSampleData();
    }
    
    return invoices;
  } catch (error) {
    console.error('Error loading invoice data:', error);
    return getSampleData();
  }
}

// Fallback sample data
function getSampleData(): InvoiceData[] {
  return [
    {
      vendor_information: {
        company_name: { text: "SHAW DENTALLABORATORYINC." },
        address: { text: "105-123 Bentworth Avenue, Unit 1 NORTH YORK, Ontario, Canada M6A 1P6" },
        contact: {
          phone: { text: "" },
          email: { text: "accounts@shawlabgroup.com" }
        }
      },
      invoice_details: {
        invoice_number: { text: "93632" },
        invoice_date: { text: "2023-03-22" },
        due_date: { text: "2023-04-23" },
        financial_data: {
          total_amount: { text: "$108.72", numeric_value: 108.72 },
          line_items: [
            {
              description: { text: "RTV-737 Neutral Cure CLEAR 12 cartridges/case" },
              quantity: 2,
              amount: { text: "$38.00", numeric_value: 38 }
            },
            {
              description: { text: "Permabond 200 Cyanoacrylate 1-oz 10 bottles/case" },
              quantity: 5,
              amount: { text: "$35.00", numeric_value: 35 }
            },
            {
              description: { text: "3M 203 GP Masking Tape 24mm x 55m 36 rolls/case" },
              quantity: 1,
              amount: { text: "$15.00", numeric_value: 15 }
            }
          ],
          subtotal: { text: "$88.00", numeric_value: 88 },
          tax: { text: "$10.72", numeric_value: 10.72 },
          shipping_handling: { text: "$10.00", numeric_value: 10 },
          payment_terms: {
            terms_text: "NET30",
            standardized: "Net 30",
            early_pay_discount: {
              found: false,
              text: "",
              percentage: null,
              days: null
            },
            late_fee: {
              found: true,
              percentage: 1.5,
              period: "per month"
            }
          }
        }
      }
    }
  ];
}
