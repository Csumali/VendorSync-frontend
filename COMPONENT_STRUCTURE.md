# VendorSync Dashboard - Component Structure

## Overview
The VendorSync dashboard has been converted from a single HTML file into a modular React/Next.js application with TypeScript and CSS modules.

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard page
│   │   └── dashboard.module.css  # Dashboard layout styles
│   ├── globals.css               # Global styles and CSS variables
│   └── layout.tsx                # Root layout
├── components/
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── Sidebar.module.css
│   ├── Header.tsx                # Top header with search and actions
│   ├── Header.module.css
│   ├── KPICards.tsx              # KPI metrics cards
│   ├── KPICards.module.css
│   ├── PaymentCalendar.tsx       # Interactive payment calendar
│   ├── PaymentCalendar.module.css
│   ├── Charts.tsx                # Canvas-based charts
│   ├── Charts.module.css
│   ├── Alerts.tsx                # Alert center
│   ├── Alerts.module.css
│   ├── VendorTable.tsx           # Vendor performance table
│   ├── VendorTable.module.css
│   ├── RenewalsTable.tsx         # Contract renewals table
│   └── RenewalsTable.module.css
├── types/
│   └── index.ts                  # TypeScript interfaces
└── data/
    └── mockData.ts               # Mock data for demo
```

## Key Features

### 🎨 Design System
- **CSS Variables**: Centralized color scheme and design tokens
- **Dark Theme**: Professional dark theme optimized for business dashboards
- **Responsive Design**: Mobile-first approach with responsive grid layouts
- **CSS Modules**: Scoped styling to prevent conflicts

### 🧩 Component Architecture
- **Modular Components**: Each UI section is a separate, reusable component
- **TypeScript**: Full type safety with interfaces for all data structures
- **Props-based**: Clean component interfaces with proper prop typing
- **State Management**: React hooks for local state management

### 📊 Interactive Features
- **Dynamic Charts**: Canvas-based line and bar charts with real-time updates
- **Optimization Modes**: Toggle between Balanced, Max Savings, and Cash Heavy modes
- **Payment Calendar**: Interactive calendar showing payment schedules
- **Alert System**: Real-time alerts with action buttons

### 🎯 Business Logic
- **Vendor Management**: Track vendor performance, compliance, and pricing
- **Payment Optimization**: AI-driven payment timing recommendations
- **Contract Monitoring**: Track renewals and compliance requirements
- **Price Monitoring**: Alert system for vendor price changes

## Component Details

### Sidebar Component
- **Navigation**: Main app navigation with icons
- **Branding**: VendorSync logo and tagline
- **Demo Note**: Contextual information about demo data

### Header Component
- **Search**: Global search functionality
- **Optimization Toggle**: Switch between payment optimization modes
- **Actions**: Contract scanning and export functionality
- **User Info**: Current user display

### KPI Cards
- **Total Vendors**: Count of connected vendors
- **Active Contracts**: Number of active vendor contracts
- **Upcoming Payments**: Payments due in next 30 days
- **Projected Savings**: Annual savings from optimization

### Payment Calendar
- **Monthly View**: Current month with payment events
- **Event Types**: Different badge types for payment urgency
- **Navigation**: Month navigation controls

### Charts Component
- **Savings Projection**: Line chart showing cash flow optimization
- **Price Monitoring**: Bar chart tracking vendor price changes
- **Dynamic Updates**: Charts update based on optimization mode

### Alerts Component
- **Alert Types**: Danger, warning, and success alerts
- **Actions**: Snooze and resolve functionality
- **Visual Indicators**: Color-coded alert levels

### Vendor Table
- **Performance Metrics**: Spend, price changes, on-time delivery
- **Compliance Status**: Visual compliance indicators
- **Payment Schedule**: Next payment dates

### Renewals Table
- **Contract Tracking**: Upcoming contract renewals
- **Status Indicators**: Auto-renew, negotiation, review status
- **Vendor Information**: Associated vendor details

## Data Models

### TypeScript Interfaces
```typescript
interface Vendor {
  name: string;
  spend: number;
  priceDelta: number;
  onTime: number;
  compliance: string;
  nextPay: string;
  score: number;
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
```

## Styling Approach

### CSS Variables
- Centralized color scheme in `:root`
- Consistent spacing and typography
- Easy theme customization

### CSS Modules
- Scoped component styles
- No global style conflicts
- Maintainable and organized

### Responsive Design
- Mobile-first approach
- Grid-based layouts
- Breakpoint-based adjustments

## Development Notes

### Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Navigate to `/dashboard` to see the application

### Key Dependencies
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type safety and better development experience
- **CSS Modules**: Scoped styling solution

### Future Enhancements
- **Real API Integration**: Replace mock data with real backend
- **Authentication**: Integrate with Clerk for user management
- **Contract OCR**: Add document scanning functionality
- **Payment Processing**: Integrate with payment systems
- **Notifications**: Real-time alert system
- **Analytics**: Advanced reporting and insights

## Demo Features

The current implementation includes:
- ✅ Complete UI recreation from HTML
- ✅ Interactive optimization mode switching
- ✅ Dynamic chart rendering
- ✅ Responsive design
- ✅ TypeScript type safety
- ✅ Modular component architecture
- ✅ CSS modules for styling
- ✅ Mock data for demonstration

This structure provides a solid foundation for building out the full VendorSync application with real backend integration and advanced features.
