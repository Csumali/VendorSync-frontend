# JSON Data System for VendorSync

This document explains how the VendorSync dashboard now uses JSON files to load and process invoice data instead of hardcoded mock data.

## Overview

The system has been updated to:
1. Load invoice data from JSON files in the `public/data/` directory
2. Process the JSON data to generate dashboard metrics
3. Display real invoice information in the dashboard components

## JSON File Structure

Each JSON file should follow this structure:

```json
{
    "vendor_information": {
        "company_name": {
            "text": "COMPANY NAME"
        },
        "address": {
            "text": "Full address"
        },
        "contact": {
            "phone": {
                "text": "Phone number"
            },
            "email": {
                "text": "email@company.com"
            }
        }
    },
    "invoice_details": {
        "invoice_number": {
            "text": "Invoice number"
        },
        "invoice_date": {
            "text": "YYYY-MM-DD"
        },
        "due_date": {
            "text": "YYYY-MM-DD"
        },
        "financial_data": {
            "total_amount": {
                "text": "$1,234.56",
                "numeric_value": 1234.56
            },
            "line_items": [
                {
                    "description": {
                        "text": "Item description"
                    },
                    "quantity": 1,
                    "amount": {
                        "text": "$100.00",
                        "numeric_value": 100
                    }
                }
            ],
            "subtotal": {
                "text": "$1,000.00",
                "numeric_value": 1000
            },
            "tax": {
                "text": "$100.00",
                "numeric_value": 100
            },
            "shipping_handling": {
                "text": "$34.56",
                "numeric_value": 34.56
            },
            "payment_terms": {
                "terms_text": "NET30",
                "standardized": "Net 30",
                "early_pay_discount": {
                    "found": true,
                    "text": "2% discount if paid within 10 days",
                    "percentage": 2,
                    "days": 10
                },
                "late_fee": {
                    "found": true,
                    "percentage": 1.5,
                    "period": "per month"
                }
            }
        }
    }
}
```

## Sample Files

The system includes 5 sample JSON files:
- `invoice_001.json` - SHAW DENTALLABORATORYINC.
- `invoice_002.json` - PACIFIC PRODUCE CO.
- `invoice_003.json` - NORTHWEST DAIRY LTD.
- `invoice_004.json` - METRO PACKAGING
- `invoice_005.json` - EVERGREEN CLEANING

## How It Works

### 1. Data Loading
- The `DataProcessor` class loads JSON files from `public/data/`
- Files are fetched using the browser's `fetch` API
- If JSON files fail to load, the system falls back to sample data

### 2. Data Processing
- Invoices are grouped by vendor name
- Vendor metrics are calculated from invoice data:
  - Total spend across all invoices
  - On-time payment percentage (simulated)
  - Price change trends (simulated)
  - Compliance status based on payment terms
  - Vendor score based on performance

### 3. Dashboard Generation
- Alerts are generated based on payment terms and vendor performance
- Renewals are simulated with random dates and statuses
- KPIs are calculated from aggregated vendor data
- Calendar events are created from invoice due dates

## Adding New JSON Files

To add new invoice data:

1. Create a new JSON file in `public/data/` following the structure above
2. Name it `invoice_XXX.json` where XXX is a unique identifier
3. Update the `invoiceFiles` array in `dataProcessor.ts` to include your new file
4. The system will automatically load and process the new data

## Key Features

### Payment Terms Analysis
- Detects early payment discounts
- Identifies late fee risks
- Standardizes payment terms (Net 30, Net 15, etc.)

### Vendor Scoring
- Calculates vendor performance scores
- Factors in on-time payments, price changes, and compliance
- Scores range from 0-100

### Smart Alerts
- Price increase warnings
- Late fee risk notifications
- Early payment discount opportunities
- Payment due reminders

### Financial Analytics
- Total spend tracking
- Average invoice amounts
- Projected savings calculations
- Payment optimization suggestions

## Error Handling

The system includes robust error handling:
- Graceful fallback to sample data if JSON files fail to load
- Individual file loading errors don't break the entire system
- User-friendly error messages with refresh options
- Console logging for debugging

## Performance

- Data is loaded asynchronously to prevent UI blocking
- Parallel loading of multiple JSON files
- Efficient data processing with minimal memory usage
- Responsive loading states for better UX

## Future Enhancements

Potential improvements:
- Real-time data updates
- API integration for live invoice data
- Advanced analytics and reporting
- Export functionality for processed data
- Data validation and schema checking
