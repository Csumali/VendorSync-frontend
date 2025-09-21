'use client';

import { useState, useRef } from 'react';
import styles from './ScanContractModal.module.css';

interface ScanContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
  uploadResponse?: any;
  isConfirmModalOpen: boolean;
  onDataConfirmation: (isCorrect: boolean) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              backgroundColor: '#f5f5f5', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#1976d2', fontSize: '16px', fontWeight: '600' }}>📊 Extracted Data:</h4>
              <pre style={{ 
                fontSize: '14px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                lineHeight: '1.5'
              }}>
                {JSON.stringify(uploadResponse, null, 2)}
              </pre>
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
                onClick={() => onDataConfirmation(true)}
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
