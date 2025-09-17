export interface Vendor {
  name: string;
  spend: number;
  priceDelta: number;
  onTime: number;
  compliance: string;
  nextPay: string;
  score: number;
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
}

export interface CalendarEvent {
  day: number;
  label: string;
  type: 'soon' | 'due' | 'save';
}

export type OptimizationMode = 'Balanced' | 'Max Savings' | 'Cash Heavy';
