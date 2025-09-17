import { Vendor, Alert, Renewal, KPIs, CalendarEvent } from '@/types';

export const vendors: Vendor[] = [
  { name: 'Pacific Produce Co.', spend: 8240, priceDelta: -1.6, onTime: 98, compliance: 'OK', nextPay: 'Sep 03', score: 92 },
  { name: 'Northwest Dairy Ltd.', spend: 5625, priceDelta: 3.4, onTime: 91, compliance: 'OK', nextPay: 'Sep 08', score: 86 },
  { name: 'Metro Packaging', spend: 4130, priceDelta: 6.2, onTime: 88, compliance: 'Renew Cert', nextPay: 'Aug 29', score: 74 },
  { name: 'Evergreen Cleaning', spend: 1975, priceDelta: 0.0, onTime: 99, compliance: 'OK', nextPay: 'Aug 28', score: 90 },
  { name: 'QuickSoft (SaaS)', spend: 1220, priceDelta: 12.0, onTime: 100, compliance: 'OK', nextPay: 'Sep 01', score: 70 },
];

export const alerts: Alert[] = [
  { level: 'danger', text: 'QuickSoft increased price by 12% (review before auto-renew)' },
  { level: 'warn', text: 'Metro Packaging COI expires in 5 days' },
  { level: 'ok', text: 'Early-pay discount captured: $210 from Pacific Produce' },
  { level: 'warn', text: 'Net 30 to Net 15 mismatch on Northwest Dairy — adjust schedule?' },
];

export const renewals: Renewal[] = [
  { contract: 'Produce Supply 2025', vendor: 'Pacific Produce Co.', renews: 'Oct 15', status: 'Auto‑renew' },
  { contract: 'Cleaning Services', vendor: 'Evergreen Cleaning', renews: 'Sep 30', status: 'Negotiation' },
  { contract: 'SaaS Subscription', vendor: 'QuickSoft', renews: 'Aug 31', status: 'Review' },
];

export const kpis: KPIs = {
  totalVendors: vendors.length,
  activeContracts: 18,
  upcomingPayments: 9,
  projectedSavings: 6280,
};

export const calendarEvents: CalendarEvent[] = [
  { day: 2, label: 'Net 15', type: 'soon' },
  { day: 3, label: '2/10', type: 'save' },
  { day: 8, label: 'Net 30', type: 'due' },
  { day: 15, label: 'SaaS', type: 'soon' },
  { day: 21, label: 'Produce', type: 'save' },
  { day: 28, label: 'Packaging', type: 'due' },
];

export const savingsSeries = [12, 10, 11, 13, 15, 14, 17, 18, 16, 19, 21, 22].map(v => v * 120);
