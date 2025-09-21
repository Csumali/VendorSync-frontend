'use client';

import { useState, useEffect } from 'react';
import styles from './ScanContractModal.module.css';

interface ExtractedData {
  bill_to?: {
    company_name?: { text?: string };
    address?: { text?: string };
    contact?: {
      phone?: { text?: string | null };
      email?: { text?: string | null };
    };
  };
  invoice_details?: {
    invoice_number?: { text?: string | null };
    invoice_date?: { text?: string | null };
    due_date?: { text?: string | null };
    financial_data?: {
      total_amount?: { text?: string | null; numeric_value?: number | null };
      subtotal?: { text?: string | null; numeric_value?: number | null };
      tax?: { text?: string | null; numeric_value?: number | null };
      line_items?: Array<{
        description?: { text?: string | null };
        quantity?: number | null;
        amount?: { text?: string | null; numeric_value?: number | null };
      }>;
      payment_terms?: {
        terms_text?: string | null;
        standardized?: string | null;
        early_pay_discount?: {
          found?: boolean;
          text?: string;
          percentage?: number | null;
          days?: number | null;
        };
        late_fee?: {
          found?: boolean;
          percentage?: number | null;
          period?: string | null;
        };
      };
    };
  };
}

interface DataConfirmationModalProps {
  isOpen: boolean;
  extractedData: ExtractedData | null;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
}

export default function DataConfirmationModal({ 
  isOpen, 
  extractedData, 
  onConfirm, 
  onCancel 
}: DataConfirmationModalProps) {
  const [editableData, setEditableData] = useState<ExtractedData | null>(null);

  // Initialize editable data when extractedData changes
  useEffect(() => {
    if (extractedData) {
      setEditableData(JSON.parse(JSON.stringify(extractedData))); // Deep clone
    }
  }, [extractedData]);

  // Function to update nested form data
  const updateFormData = (path: string, value: string) => {
    setEditableData((prev: ExtractedData | null) => {
      if (!prev) return null;
      
      const newData = JSON.parse(JSON.stringify(prev)); // Deep clone
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Function to get nested value
  const getFormValue = (path: string) => {
    if (!editableData) return '';
    
    const keys = path.split('.');
    let current = editableData;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return '';
      }
    }
    
    return typeof current === 'string' ? current : '';
  };

  // Function to render form fields recursively
  const renderFormFields = (data: any, prefix = '', level = 0): React.ReactElement[] => {
    const fields: React.ReactElement[] = [];
    
    if (!data || typeof data !== 'object') return fields;
    
    Object.entries(data).forEach(([key, value]) => {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const fieldId = `field-${fieldPath.replace(/\./g, '-')}`;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Skip complex nested objects for now
        if (key === 'line_items' || key === 'payment_terms') return;
        
        // Render nested object as a section
        fields.push(
          <div key={fieldId} style={{ marginLeft: `${level * 20}px`, marginBottom: '20px' }}>
            <h5 style={{ 
              margin: '0 0 10px 0', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#1976d2',
              textTransform: 'capitalize',
              borderBottom: '1px solid #e0e0e0',
              paddingBottom: '5px'
            }}>
              {key.replace(/_/g, ' ')}
            </h5>
            {renderFormFields(value, fieldPath, level + 1)}
          </div>
        );
      } else if (typeof value === 'string' || typeof value === 'number') {
        // Render as input field
        fields.push(
          <div key={fieldId} style={{ marginBottom: '15px', marginLeft: `${level * 20}px` }}>
            <label 
              htmlFor={fieldId}
              style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#333',
                textTransform: 'capitalize'
              }}
            >
              {key.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              id={fieldId}
              value={getFormValue(fieldPath)}
              onChange={(e) => updateFormData(fieldPath, e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#fff',
                color: '#333',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2';
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
              }}
            />
          </div>
        );
      }
    });
    
    return fields;
  };

  const handleConfirm = () => {
    if (editableData) {
      onConfirm(editableData);
    }
  };

  if (!isOpen || !extractedData || !editableData) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className={styles.header}>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>📋 Confirm Extracted Data</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#2e7d32', fontSize: '20px', fontWeight: '600' }}>✅ PDF Successfully Processed!</h3>
            <p style={{ fontSize: '16px', color: '#333', margin: 0 }}>
              Please review and edit the extracted data below before creating the vendor and invoice:
            </p>
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px',
            maxHeight: '500px',
            overflow: 'auto',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#1976d2', fontSize: '18px', fontWeight: '600' }}>📊 Edit Data:</h4>
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '20px', 
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              {renderFormFields(editableData)}
            </div>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1976d2' }}>🤔 Is this data correct?</h4>
            <p style={{ margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.6', color: '#333' }}>
              Please carefully review the extracted information above. You can edit any field before confirming. 
              Once confirmed, a vendor and invoice will be created with this data.
            </p>
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.cancelBtn} 
              onClick={onCancel}
              style={{ backgroundColor: '#f44336' }}
            >
              ❌ Cancel
            </button>
            <button 
              className={styles.confirmBtn} 
              onClick={handleConfirm}
              style={{ backgroundColor: '#4caf50' }}
            >
              ✅ Confirm & Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
