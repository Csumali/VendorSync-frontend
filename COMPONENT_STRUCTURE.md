# VendorSync Dashboard - Component Structure

## Overview
The VendorSync dashboard has been converted from a single HTML file into a modular React/Next.js application with TypeScript, CSS modules, and a JSON-based data system that processes real invoice data.

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard page with JSON data integration
│   │   └── dashboard.module.css  # Dashboard layout styles
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx          # Clerk authentication sign-in
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx          # Clerk authentication sign-up
│   ├── page.tsx                  # Landing page with Clerk integration
│   ├── globals.css               # Global styles and CSS variables
│   ├── layout.tsx                # Root layout with Clerk provider
│   └── middleware.ts             # Clerk middleware for route protection
├── components/
│   ├── Sidebar.tsx               # Navigation sidebar with user info
│   ├── Sidebar.module.css
│   ├── Header.tsx                # Top header with scan contract modal
│   ├── Header.module.css
│   ├── KPICards.tsx              # Enhanced KPI metrics cards (6 cards)
│   ├── KPICards.module.css
│   ├── PaymentCalendar.tsx       # Interactive calendar with year/month filtering
│   ├── PaymentCalendar.module.css
│   ├── Charts.tsx                # Canvas-based charts
│   ├── Charts.module.css
│   ├── Alerts.tsx                # Alert center
│   ├── Alerts.module.css
│   ├── VendorTable.tsx           # Vendor performance table
│   ├── VendorTable.module.css
│   ├── RenewalsTable.tsx         # Contract renewals table
│   ├── RenewalsTable.module.css
│   ├── ScanContractModal.tsx     # PDF upload and preview modal
│   └── ScanContractModal.module.css
├── types/
│   └── index.ts                  # TypeScript interfaces for JSON and dashboard data
├── data/
│   ├── dataProcessor.ts          # JSON invoice data processing engine
│   ├── dataService.ts            # Async data loading and management
│   └── mockData.ts               # Fallback mock data
└── public/
    └── data/
        ├── invoice_001.json      # SHAW DENTALLABORATORYINC. invoice
        ├── invoice_002.json      # PACIFIC PRODUCE CO. invoice
        ├── invoice_003.json      # NORTHWEST DAIRY LTD. invoice
        ├── invoice_004.json      # METRO PACKAGING invoice
        └── invoice_005.json      # EVERGREEN CLEANING invoice
```

## Key Features

### 🎨 Design System
- **CSS Variables**: Centralized color scheme and design tokens
- **Dark Theme**: Professional dark theme optimized for business dashboards
- **Responsive Design**: Mobile-first approach with responsive grid layouts
- **CSS Modules**: Scoped styling to prevent conflicts
- **Enhanced Typography**: Larger fonts and improved spacing for better readability

### 🧩 Component Architecture
- **Modular Components**: Each UI section is a separate, reusable component
- **TypeScript**: Full type safety with interfaces for all data structures
- **Props-based**: Clean component interfaces with proper prop typing
- **State Management**: React hooks for local state management
- **Async Data Loading**: Dynamic data fetching with loading states and error handling

### 📊 Interactive Features
- **Dynamic Charts**: Canvas-based line and bar charts with real-time updates
- **Optimization Modes**: Toggle between Balanced, Max Savings, and Cash Heavy modes
- **Enhanced Payment Calendar**: Interactive calendar with year/month filtering and current day highlighting
- **Alert System**: Real-time alerts with action buttons
- **Scan Contract Modal**: PDF upload, preview, and confirmation functionality
- **Month/Year Picker**: Popup calendar for easy date navigation

### 🎯 Business Logic
- **JSON Data Processing**: Real invoice data processing from JSON files
- **Vendor Management**: Track vendor performance, compliance, and pricing
- **Payment Optimization**: AI-driven payment timing recommendations
- **Contract Monitoring**: Track renewals and compliance requirements
- **Price Monitoring**: Alert system for vendor price changes
- **Payment Terms Analysis**: Early pay discounts and late fee detection

### 🔐 Authentication & Security
- **Clerk Integration**: Complete user authentication system
- **Protected Routes**: Dashboard requires authentication
- **User Management**: Dynamic user profile display
- **Sign-in/Sign-up**: Seamless authentication flow

## Component Details

### Sidebar Component
- **Navigation**: Main app navigation with icons
- **Branding**: VendorSync logo and tagline
- **User Profile**: Dynamic user information from Clerk authentication
- **Demo Note**: Contextual information about JSON data system

### Header Component
- **Search**: Global search functionality
- **Optimization Toggle**: Switch between payment optimization modes
- **Scan Contract**: Blue primary button with PDF upload modal
- **User Display**: Current authenticated user name

### KPI Cards (Enhanced - 6 Cards)
- **Total Vendors**: Count of connected vendors from JSON data
- **Active Contracts**: Number of active vendor contracts
- **Upcoming Payments**: Payments due in next 30 days
- **Projected Savings**: Annual savings from optimization
- **Total Spend**: Aggregate spending across all vendors
- **Average Invoice**: Average invoice amount per transaction

### Payment Calendar (Enhanced)
- **Current Day Highlighting**: Blue border and background for today's date
- **Year/Month Filtering**: Events only show for selected year/month
- **Interactive Navigation**: Arrow buttons for month navigation
- **Date Picker Modal**: Click month title for year/month selection
- **Real Invoice Events**: Events based on actual JSON invoice due dates
- **Event Types**: Green (early pay discount), Yellow (late fee risk), Red (standard due)

### Charts Component
- **Savings Projection**: Line chart showing cash flow optimization
- **Price Monitoring**: Bar chart tracking vendor price changes
- **Dynamic Updates**: Charts update based on optimization mode

### Alerts Component
- **Alert Types**: Danger, warning, and success alerts
- **Actions**: Snooze and resolve functionality
- **Visual Indicators**: Color-coded alert levels
- **JSON-Based**: Alerts generated from invoice payment terms

### Vendor Table
- **Performance Metrics**: Spend, price changes, on-time delivery
- **Compliance Status**: Visual compliance indicators
- **Payment Schedule**: Next payment dates
- **Contact Information**: Email and address from JSON data

### Renewals Table
- **Contract Tracking**: Upcoming contract renewals
- **Status Indicators**: Auto-renew, negotiation, review status
- **Vendor Information**: Associated vendor details

### Scan Contract Modal
- **PDF Upload**: Drag-and-drop or click to upload
- **File Preview**: PDF preview with iframe
- **File Validation**: PDF type checking and size limits
- **Confirmation Flow**: Review before processing
- **Responsive Design**: Mobile-friendly modal interface

## Data Models

### JSON Invoice Data Structure
```typescript
interface InvoiceData {
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
```

### Dashboard Data Interfaces
```typescript
interface Vendor {
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

interface Alert {
  level: 'danger' | 'warn' | 'ok';
  text: string;
}

interface Renewal {
  contract: string;
  vendor: string;
  renews: string;
  status: string;
}

interface KPIs {
  totalVendors: number;
  activeContracts: number;
  upcomingPayments: number;
  projectedSavings: number;
  totalSpend: number;
  averageInvoiceAmount: number;
}

interface CalendarEvent {
  day: number;
  label: string;
  type: 'soon' | 'due' | 'save';
}
```

## Data Processing System

### JSON Data Processing
- **DataProcessor Class**: Converts JSON invoices into dashboard metrics
- **Vendor Aggregation**: Groups multiple invoices per vendor
- **Smart Calculations**: Vendor scores, compliance status, payment terms analysis
- **Event Generation**: Calendar events based on actual due dates
- **Alert Creation**: Alerts from payment terms and vendor performance

### Data Service Layer
- **Async Loading**: Dynamic data fetching with loading states
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Caching**: Efficient data management and state persistence
- **Year/Month Filtering**: Calendar events filtered by selected time period

### Sample Data
- **5 JSON Invoice Files**: Real invoice data in standardized format
- **Multiple Vendors**: SHAW, Pacific Produce, Northwest Dairy, Metro Packaging, Evergreen Cleaning
- **Payment Terms**: Early pay discounts, late fees, Net 30/15 terms
- **Financial Data**: Line items, taxes, shipping, totals

## Styling Approach

### CSS Variables
- Centralized color scheme in `:root`
- Consistent spacing and typography
- Easy theme customization
- Enhanced typography with larger fonts

### CSS Modules
- Scoped component styles
- No global style conflicts
- Maintainable and organized
- Modal and overlay styles for enhanced UX

### Responsive Design
- Mobile-first approach
- Grid-based layouts
- Breakpoint-based adjustments
- Enhanced KPI grid (3 columns on desktop, responsive on mobile)

## Development Notes

### Getting Started
1. Install dependencies: `npm install`
2. Set up Clerk authentication (environment variables)
3. Start development server: `npm run dev`
4. Navigate to `/` for landing page or `/dashboard` for application

### Key Dependencies
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type safety and better development experience
- **CSS Modules**: Scoped styling solution
- **Clerk**: Authentication and user management
- **Canvas API**: Custom chart rendering

### Environment Setup
- **Clerk Keys**: Required for authentication
- **JSON Data**: Invoice files in `public/data/` directory
- **Development**: Hot reloading with JSON data changes

### Future Enhancements
- **Real API Integration**: Replace JSON files with live backend
- **Contract OCR**: Enhanced document scanning with AI processing
- **Payment Processing**: Integrate with payment systems
- **Notifications**: Real-time alert system
- **Analytics**: Advanced reporting and insights
- **Data Validation**: Schema validation for JSON invoices
- **Export Functionality**: Data export and reporting features

## Current Implementation Status

### ✅ Completed Features
- **Complete UI Recreation**: From HTML to React components
- **Clerk Authentication**: Full user management system
- **JSON Data System**: Real invoice data processing
- **Enhanced Payment Calendar**: Year/month filtering, current day highlighting
- **Scan Contract Modal**: PDF upload and preview functionality
- **Interactive Navigation**: Month/year picker, arrow navigation
- **Enhanced KPIs**: 6-card layout with total spend and average invoice
- **Responsive Design**: Mobile-first with enhanced typography
- **TypeScript Type Safety**: Complete type coverage
- **Modular Architecture**: Reusable component system
- **CSS Modules**: Scoped styling with enhanced UX
- **Error Handling**: Graceful fallbacks and loading states
- **Real Data Integration**: Dashboard metrics from actual invoices

### 🔄 Data Flow
1. **JSON Files** → Loaded from `public/data/`
2. **DataProcessor** → Converts to dashboard metrics
3. **DataService** → Manages async loading and caching
4. **Components** → Display processed data with real-time updates
5. **User Interactions** → Calendar navigation, modal interactions

This structure provides a production-ready foundation for the full VendorSync application with real backend integration and advanced business features.
