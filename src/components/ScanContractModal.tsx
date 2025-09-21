'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ScanContractModal.module.css';

interface ScanContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
  uploadResponse?: any;
  isConfirmModalOpen: boolean;
  onDataConfirmation: (isCorrect: boolean, editedData?: any) => void;
}

export default function ScanContractModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  uploadResponse, 
  isConfirmModalOpen, 
  onDataConfirmation 
}: ScanContractModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editableData, setEditableData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize editable data when uploadResponse changes
  useEffect(() => {
    if (uploadResponse) {
      setEditableData(uploadResponse);
    }
  }, [uploadResponse]);

  // Function to update nested form data
  const updateFormData = (path: string, value: string) => {
    setEditableData((prev: any) => {
      const newData = { ...prev };
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

  const handleFileSelect = (file: File) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onConfirm(selectedFile);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show confirmation modal if response data is available
  if (isConfirmModalOpen && uploadResponse) {
    return (
      <div className={styles.overlay} onClick={() => onDataConfirmation(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className={styles.header}>
            <h2 style={{ fontSize: '24px', fontWeight: '600' }}>📋 Confirm Contract Data</h2>
            <button className={styles.closeBtn} onClick={() => onDataConfirmation(false)}>
              ✕
            </button>
          </div>

          <div className={styles.content}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#2e7d32', fontSize: '20px', fontWeight: '600' }}>✅ Contract Successfully Processed!</h3>
              <p style={{ fontSize: '16px', color: '#333', margin: 0 }}>Please review the extracted contract data below:</p>
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
                {editableData && renderFormFields(editableData)}
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
                Please carefully review the extracted information above. If the data looks accurate, 
                click "✅ Confirm" to save it. If not, click "❌ Reject" to try again.
              </p>
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => onDataConfirmation(false)}
                style={{ backgroundColor: '#f44336' }}
              >
                ❌ Reject Data
              </button>
              <button 
                className={styles.confirmBtn} 
                onClick={() => onDataConfirmation(true, editableData)}
                style={{ backgroundColor: '#4caf50' }}
              >
                ✅ Confirm Data
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📷 Scan Contract</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {!selectedFile ? (
            <div className={styles.uploadSection}>
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.dropZoneContent}>
                  <div className={styles.uploadIcon}>📄</div>
                  <h3>Upload Contract PDF</h3>
                  <p>Drag and drop your PDF file here, or click to browse</p>
                  <button className={styles.browseBtn}>
                    Choose File
                  </button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className={styles.previewSection}>
              <div className={styles.fileInfo}>
                <div className={styles.fileIcon}>📄</div>
                <div className={styles.fileDetails}>
                  <h3>{selectedFile.name}</h3>
                  <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button className={styles.removeBtn} onClick={handleRemoveFile}>
                  ✕
                </button>
              </div>

              <div className={styles.pdfPreview}>
                <iframe
                  src={previewUrl || ''}
                  width="100%"
                  height="400px"
                  style={{ border: 'none', borderRadius: '8px' }}
                  title="PDF Preview"
                />
              </div>

              <div className={styles.confirmation}>
                <p>Please review the contract above. Do you want to proceed with scanning this document?</p>
                <div className={styles.actions}>
                  <button className={styles.cancelBtn} onClick={handleRemoveFile}>
                    Cancel
                  </button>
                  <button className={styles.confirmBtn} onClick={handleConfirm}>
                    ✅ Proceed with Scan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
