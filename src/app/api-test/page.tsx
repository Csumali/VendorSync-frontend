'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, SignIn } from '@clerk/nextjs';
import { getApiService } from '@/data/apiService';
import { ApiVendor, ApiInvoice } from '@/types';

export default function ApiTestPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  
  // State for vendors
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [vendorForm, setVendorForm] = useState<Partial<ApiVendor>>({
    name: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // State for invoices
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Partial<ApiInvoice>>({
    invoiceNumber: '',
    date: '',
    dueDate: '',
    subtotal: 0,
    totalAmount: 0,
    paymentTerms: '',
    earlyPayDiscount: 0,
    lateFee: 0
  });
  
  // Edit modal state
  const [editId, setEditId] = useState<string | null>(null);
  
  // State for extracted data
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vendors' | 'invoices' | 'upload'>('vendors');
  
  // API Service
  const [apiService, setApiService] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && getToken) {
      setApiService(getApiService(getToken));
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Load vendors
  const loadVendors = async () => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    try {
      const vendorsData = await apiService.getVendors();
      setVendors(vendorsData);
      setSuccess(`Loaded ${vendorsData.length} vendors`);
    } catch (err: any) {
      setError(`Failed to load vendors: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load all invoices (like payments page)
  const loadAllInvoices = async () => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const headers = {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/vendor/invoice/all`, { 
        headers, 
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Fetch invoices failed ${res.status} ${t}`);
      }
      
      const json = await res.json();
      const invoicesData = Array.isArray(json) ? json : (json?.invoices ?? []);
      setInvoices(invoicesData);
      setSuccess(`Loaded ${invoicesData.length} invoices from all vendors`);
    } catch (err: any) {
      setError(`Failed to load invoices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load invoices for selected vendor
  const loadInvoices = async (vendorId: string) => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    try {
      const invoicesData = await apiService.getVendorInvoices(vendorId);
      setInvoices(invoicesData);
      setSuccess(`Loaded ${invoicesData.length} invoices for selected vendor`);
    } catch (err: any) {
      setError(`Failed to load invoices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Vendor CRUD Operations
  const createVendor = async () => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    try {
      const newVendor = await apiService.createVendor(vendorForm);
      setVendors([...vendors, newVendor]);
      setVendorForm({ name: '', address: '', email: '', phone: '' });
      setSuccess('Vendor created successfully');
    } catch (err: any) {
      setError(`Failed to create vendor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateVendor = async () => {
    if (!apiService || !selectedVendor) return;
    
    setLoading(true);
    setError(null);
    try {
      const updatedVendor = await apiService.updateVendor(selectedVendor.id, vendorForm);
      setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v));
      setSelectedVendor(updatedVendor);
      setSuccess('Vendor updated successfully');
    } catch (err: any) {
      setError(`Failed to update vendor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (!apiService) return;
    
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiService.deleteVendor(vendorId);
      setVendors(vendors.filter(v => v.id !== vendorId));
      if (selectedVendor?.id === vendorId) {
        setSelectedVendor(null);
        setInvoices([]);
      }
      setSuccess('Vendor deleted successfully');
    } catch (err: any) {
      setError(`Failed to delete vendor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Invoice CRUD Operations
  const createInvoice = async () => {
    if (!apiService || !selectedVendor) return;
    
    setLoading(true);
    setError(null);
    try {
      const newInvoice = await apiService.createInvoice(selectedVendor.id, invoiceForm);
      setInvoices([...invoices, newInvoice]);
      setInvoiceForm({
        invoiceNumber: '',
        date: '',
        dueDate: '',
        subtotal: 0,
        totalAmount: 0,
        paymentTerms: '',
        earlyPayDiscount: 0,
        lateFee: 0
      });
      setSuccess('Invoice created successfully');
    } catch (err: any) {
      setError(`Failed to create invoice: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateInvoice = async () => {
    if (!apiService || !selectedVendor || !selectedInvoice) return;
    
    setLoading(true);
    setError(null);
    try {
      const updatedInvoice = await apiService.updateInvoice(selectedVendor.id, selectedInvoice.id, invoiceForm);
      setInvoices(invoices.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv));
      setSelectedInvoice(updatedInvoice);
      setSuccess('Invoice updated successfully');
    } catch (err: any) {
      setError(`Failed to update invoice: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string, vendorId: string) => {
    if (!apiService) return;
    
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    const prev = invoices;
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const headers = {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/vendor/${vendorId}/invoice/${invoiceId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Delete failed: ${res.status} ${t}`);
      }
      
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(null);
      }
      setSuccess('Invoice deleted successfully');
    } catch (err: any) {
      setInvoices(prev); // rollback
      setError(`Failed to delete invoice: ${err.message}`);
    }
  };

  // Edit invoice function (following payments page pattern)
  const saveEdit = async (invId: string, vendorId: string, patch: Partial<ApiInvoice>) => {
    const prev = invoices;
    // optimistic
    setInvoices(prev => prev.map(i => (i.id === invId ? { ...i, ...patch } : i)));
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const headers = {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
      };

      const body: any = {
        invoiceNumber: patch.invoiceNumber,
        date: patch.date,
        dueDate: patch.dueDate,
        subtotal: patch.subtotal,
        totalAmount: patch.totalAmount,
        paymentTerms: patch.paymentTerms,
        earlyPayDiscount: patch.earlyPayDiscount,
        lateFee: patch.lateFee,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/vendor/${vendorId}/invoice/${invId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Update failed: ${res.status} ${t}`);
      }
      setEditId(null);
      setSuccess('Invoice updated successfully');
    } catch (err: any) {
      setInvoices(prev); // rollback
      setError(`Failed to update invoice: ${err.message}`);
    }
  };

  // Helper functions (from payments page)
  function toNumber(v: unknown): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function money(val: unknown): string {
    const n = toNumber(val);
    return `$${n.toFixed(2)}`;
  }

  // File upload for testing
  const handleFileUpload = async (file: File) => {
    if (!apiService) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.uploadInvoice(file);
      setExtractedData(result);
      setSuccess('File uploaded successfully. Extracted data displayed below.');
      console.log('Upload result:', result);
    } catch (err: any) {
      setError(`Failed to upload file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Auth gates
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">API Test Page</h1>
          <p className="text-center text-gray-600 mb-4">Please sign in to access the API testing interface</p>
          <SignIn />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">🔧 API Test Interface</h1>
          <p className="text-gray-600">Test all vendor and invoice endpoints with full CRUD operations</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>User: {user?.emailAddresses[0]?.emailAddress}</p>
            <p>API Base: {process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}</p>
          </div>
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className="mb-6 p-4 rounded-lg flex justify-between items-center">
            {error && (
              <div className="text-red-700 bg-red-100 border border-red-300 rounded-lg p-4 flex-1 mr-4">
                <strong>Error:</strong> {error}
              </div>
            )}
            {success && (
              <div className="text-green-700 bg-green-100 border border-green-300 rounded-lg p-4 flex-1 mr-4">
                <strong>Success:</strong> {success}
              </div>
            )}
            <button
              onClick={clearMessages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'vendors', label: 'Vendors', icon: '🏢' },
                { id: 'invoices', label: 'Invoices', icon: '📄' },
                { id: 'upload', label: 'Upload Test', icon: '📤' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Vendors Tab */}
            {activeTab === 'vendors' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Vendor Management</h2>
                  <button
                    onClick={loadVendors}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load Vendors'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Vendor List */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Vendors ({vendors.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {vendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedVendor?.id === vendor.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setVendorForm(vendor);
                            loadInvoices(vendor.id);
                          }}
                        >
                          <div className="font-medium">{vendor.name}</div>
                          <div className="text-sm text-gray-600">{vendor.email}</div>
                          <div className="text-xs text-gray-500">{vendor.id}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vendor Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Vendor Details</h3>
                    {selectedVendor ? (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">ID:</div>
                          <div className="text-gray-600 font-mono text-xs">{selectedVendor.id}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Name:</div>
                          <div className="text-gray-600">{selectedVendor.name}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Email:</div>
                          <div className="text-gray-600">{selectedVendor.email || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Phone:</div>
                          <div className="text-gray-600">{selectedVendor.phone || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Address:</div>
                          <div className="text-gray-600">{selectedVendor.address || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Created:</div>
                          <div className="text-gray-600">
                            {selectedVendor.createdAt ? new Date(selectedVendor.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="font-medium">Updated:</div>
                          <div className="text-gray-600">
                            {selectedVendor.updatedAt ? new Date(selectedVendor.updatedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="mt-4 p-2 bg-gray-100 rounded">
                          <div className="font-medium text-xs mb-2">Raw JSON:</div>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(selectedVendor, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        Select a vendor to view details
                      </div>
                    )}
                  </div>

                  {/* Vendor Form */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">
                      {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={vendorForm.name || ''}
                          onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Vendor name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={vendorForm.email || ''}
                          onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="vendor@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="text"
                          value={vendorForm.phone || ''}
                          onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Phone number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                          value={vendorForm.address || ''}
                          onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          rows={3}
                          placeholder="Vendor address"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={selectedVendor ? updateVendor : createVendor}
                          disabled={loading || !vendorForm.name}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          {selectedVendor ? 'Update' : 'Create'}
                        </button>
                        {selectedVendor && (
                          <button
                            onClick={() => deleteVendor(selectedVendor.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedVendor(null);
                            setVendorForm({ name: '', address: '', email: '', phone: '' });
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">All Invoices</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={loadAllInvoices}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Load All Invoices'}
                    </button>
                    {selectedVendor && (
                      <button
                        onClick={() => loadInvoices(selectedVendor.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : `Load ${selectedVendor.name} Invoices`}
                      </button>
                    )}
                  </div>
                </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Invoice List */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Invoices ({invoices.length})</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {invoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className={`p-3 border rounded cursor-pointer transition-colors ${
                                selectedInvoice?.id === invoice.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setInvoiceForm(invoice);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{invoice.invoiceNumber || '—'}</div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditId(invoice.id);
                                  }}
                                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                >
                                  Edit
                                </button>
                              </div>
                              <div className="text-sm text-gray-600">{money(invoice.totalAmount)}</div>
                              <div className="text-xs text-gray-500">
                                {invoice.date ? new Date(invoice.date).toLocaleDateString() : '—'} - {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                              </div>
                              <div className="text-xs text-gray-400">
                                Vendor ID: {invoice.vendorId || 'N/A'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Invoice Details</h3>
                        {selectedInvoice ? (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">ID:</div>
                              <div className="text-gray-600 font-mono text-xs">{selectedInvoice.id}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Invoice #:</div>
                              <div className="text-gray-600">{selectedInvoice.invoiceNumber}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Date:</div>
                              <div className="text-gray-600">{selectedInvoice.date}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Due Date:</div>
                              <div className="text-gray-600">{selectedInvoice.dueDate}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Subtotal:</div>
                              <div className="text-gray-600">{money(selectedInvoice.subtotal)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Total Amount:</div>
                              <div className="text-gray-600 font-semibold text-lg">{money(selectedInvoice.totalAmount)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Payment Terms:</div>
                              <div className="text-gray-600">{selectedInvoice.paymentTerms || 'N/A'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Early Pay Discount:</div>
                              <div className="text-gray-600">{selectedInvoice.earlyPayDiscount || 0}%</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Late Fee:</div>
                              <div className="text-gray-600">{selectedInvoice.lateFee || 0}%</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Status:</div>
                              <div className="text-gray-600">
                                {(() => {
                                  const dueDate = new Date(selectedInvoice.dueDate);
                                  const now = new Date();
                                  if (dueDate < now) {
                                    return <span className="text-red-600 font-semibold">Overdue</span>;
                                  } else if (dueDate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000) {
                                    return <span className="text-yellow-600 font-semibold">Due Soon</span>;
                                  } else {
                                    return <span className="text-green-600 font-semibold">Current</span>;
                                  }
                                })()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Created:</div>
                              <div className="text-gray-600">
                                {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Updated:</div>
                              <div className="text-gray-600">
                                {selectedInvoice.updatedAt ? new Date(selectedInvoice.updatedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="mt-4 p-2 bg-gray-100 rounded">
                              <div className="font-medium text-xs mb-2">Raw JSON:</div>
                              <pre className="text-xs text-gray-600 overflow-x-auto">
                                {JSON.stringify(selectedInvoice, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-center py-8">
                            Select an invoice to view details
                          </div>
                        )}
                      </div>

                      {/* Invoice Form */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">
                          {selectedInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                            <input
                              type="text"
                              value={invoiceForm.invoiceNumber || ''}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              placeholder="INV-001"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Date</label>
                              <input
                                type="date"
                                value={invoiceForm.date || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Due Date</label>
                              <input
                                type="date"
                                value={invoiceForm.dueDate || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                              <input
                                type="number"
                                step="0.01"
                                value={invoiceForm.subtotal || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                value={invoiceForm.totalAmount || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
                            <input
                              type="text"
                              value={invoiceForm.paymentTerms || ''}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentTerms: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              placeholder="Net 30"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Early Pay Discount (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={invoiceForm.earlyPayDiscount || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, earlyPayDiscount: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="2.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Late Fee (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={invoiceForm.lateFee || ''}
                                onChange={(e) => setInvoiceForm({ ...invoiceForm, lateFee: parseFloat(e.target.value) || 0 })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="1.50"
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={selectedInvoice ? updateInvoice : createInvoice}
                              disabled={loading || !invoiceForm.invoiceNumber}
                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              {selectedInvoice ? 'Update' : 'Create'}
                            </button>
                            {selectedInvoice && selectedInvoice.vendorId && (
                              <button
                                onClick={() => deleteInvoice(selectedInvoice.id, selectedInvoice.vendorId)}
                                disabled={loading}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedInvoice(null);
                                setInvoiceForm({
                                  invoiceNumber: '',
                                  date: '',
                                  dueDate: '',
                                  subtotal: 0,
                                  totalAmount: 0,
                                  paymentTerms: '',
                                  earlyPayDiscount: 0,
                                  lateFee: 0
                                });
                              }}
                              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">PDF Upload Test</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="text-lg font-medium mb-2">Upload PDF Invoice</h3>
                    <p className="text-gray-600 mb-4">Test the PDF upload and OCR extraction endpoint</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                {/* Extracted Data Display */}
                {extractedData && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold mb-4">📊 Extracted Invoice Data</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Bill To Information */}
                      {extractedData.bill_to && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-3">🏢 Bill To Information</h4>
                          <div className="space-y-2 text-sm">
                            {extractedData.bill_to.company_name && (
                              <div>
                                <span className="font-medium">Company:</span>
                                <span className="ml-2 text-gray-700">
                                  {extractedData.bill_to.company_name.text || extractedData.bill_to.company_name}
                                </span>
                              </div>
                            )}
                            {extractedData.bill_to.address && (
                              <div>
                                <span className="font-medium">Address:</span>
                                <span className="ml-2 text-gray-700">
                                  {extractedData.bill_to.address.text || extractedData.bill_to.address}
                                </span>
                              </div>
                            )}
                            {extractedData.bill_to.contact && (
                              <div className="mt-2">
                                <div className="font-medium mb-1">Contact:</div>
                                {extractedData.bill_to.contact.email && (
                                  <div className="ml-2">
                                    <span className="font-medium">Email:</span>
                                    <span className="ml-2 text-gray-700">
                                      {extractedData.bill_to.contact.email.text || extractedData.bill_to.contact.email}
                                    </span>
                                  </div>
                                )}
                                {extractedData.bill_to.contact.phone && (
                                  <div className="ml-2">
                                    <span className="font-medium">Phone:</span>
                                    <span className="ml-2 text-gray-700">
                                      {extractedData.bill_to.contact.phone.text || extractedData.bill_to.contact.phone}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Invoice Details */}
                      {extractedData.invoice_details && (
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-3">📄 Invoice Details</h4>
                          <div className="space-y-2 text-sm">
                            {extractedData.invoice_details.invoice_number && (
                              <div>
                                <span className="font-medium">Invoice #:</span>
                                <span className="ml-2 text-gray-700">
                                  {extractedData.invoice_details.invoice_number.text || extractedData.invoice_details.invoice_number}
                                </span>
                              </div>
                            )}
                            {extractedData.invoice_details.invoice_date && (
                              <div>
                                <span className="font-medium">Date:</span>
                                <span className="ml-2 text-gray-700">
                                  {extractedData.invoice_details.invoice_date.text || extractedData.invoice_details.invoice_date}
                                </span>
                              </div>
                            )}
                            {extractedData.invoice_details.due_date && (
                              <div>
                                <span className="font-medium">Due Date:</span>
                                <span className="ml-2 text-gray-700">
                                  {extractedData.invoice_details.due_date.text || extractedData.invoice_details.due_date}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Financial Data */}
                    {extractedData.invoice_details?.financial_data && (
                      <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-3">💰 Financial Data</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {extractedData.invoice_details.financial_data.subtotal && (
                            <div>
                              <span className="font-medium">Subtotal:</span>
                              <span className="ml-2 text-gray-700">
                                {extractedData.invoice_details.financial_data.subtotal.text || 
                                 extractedData.invoice_details.financial_data.subtotal.numeric_value || 
                                 extractedData.invoice_details.financial_data.subtotal}
                              </span>
                            </div>
                          )}
                          {extractedData.invoice_details.financial_data.tax && (
                            <div>
                              <span className="font-medium">Tax:</span>
                              <span className="ml-2 text-gray-700">
                                {extractedData.invoice_details.financial_data.tax.text || 
                                 extractedData.invoice_details.financial_data.tax.numeric_value || 
                                 extractedData.invoice_details.financial_data.tax}
                              </span>
                            </div>
                          )}
                          {extractedData.invoice_details.financial_data.total_amount && (
                            <div>
                              <span className="font-medium">Total Amount:</span>
                              <span className="ml-2 text-gray-700 font-semibold text-lg">
                                {extractedData.invoice_details.financial_data.total_amount.text || 
                                 `$${extractedData.invoice_details.financial_data.total_amount.numeric_value?.toLocaleString()}` || 
                                 extractedData.invoice_details.financial_data.total_amount}
                              </span>
                            </div>
                          )}
                          {extractedData.invoice_details.financial_data.payment_terms && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Payment Terms:</span>
                              <div className="mt-1 ml-2 text-gray-700">
                                {extractedData.invoice_details.financial_data.payment_terms.terms_text && (
                                  <div className="text-xs mb-1">
                                    <span className="font-medium">Text:</span> {extractedData.invoice_details.financial_data.payment_terms.terms_text}
                                  </div>
                                )}
                                {extractedData.invoice_details.financial_data.payment_terms.standardized && (
                                  <div className="text-xs mb-1">
                                    <span className="font-medium">Standardized:</span> {extractedData.invoice_details.financial_data.payment_terms.standardized}
                                  </div>
                                )}
                                {extractedData.invoice_details.financial_data.payment_terms.early_pay_discount && (
                                  <div className="text-xs mb-1">
                                    <span className="font-medium">Early Pay Discount:</span> 
                                    {extractedData.invoice_details.financial_data.payment_terms.early_pay_discount.percentage ? 
                                      ` ${extractedData.invoice_details.financial_data.payment_terms.early_pay_discount.percentage}%` :
                                      extractedData.invoice_details.financial_data.payment_terms.early_pay_discount.text ? 
                                      ` ${extractedData.invoice_details.financial_data.payment_terms.early_pay_discount.text}` :
                                      extractedData.invoice_details.financial_data.payment_terms.early_pay_discount.found ? ' Found' : ' Not found'
                                    }
                                  </div>
                                )}
                                {extractedData.invoice_details.financial_data.payment_terms.late_fee && (
                                  <div className="text-xs">
                                    <span className="font-medium">Late Fee:</span> 
                                    {extractedData.invoice_details.financial_data.payment_terms.late_fee.percentage ? 
                                      ` ${extractedData.invoice_details.financial_data.payment_terms.late_fee.percentage}%` :
                                      extractedData.invoice_details.financial_data.payment_terms.late_fee.text ? 
                                      ` ${extractedData.invoice_details.financial_data.payment_terms.late_fee.text}` :
                                      extractedData.invoice_details.financial_data.payment_terms.late_fee.found ? ' Found' : ' Not found'
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Raw Data */}
                    <div className="mt-6 bg-gray-100 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">🔍 Complete Raw Data</h4>
                      <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-3 rounded border max-h-96 overflow-y-auto">
                        {JSON.stringify(extractedData, null, 2)}
                      </pre>
                    </div>

                    {/* Clear Data Button */}
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setExtractedData(null)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Clear Extracted Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======= Edit Invoice Modal ======= */}
      {editId && (() => {
        const inv = invoices.find(i => i.id === editId)!;
        return (
          <EditInvoiceModal
            key={inv.id}
            invoice={inv}
            onClose={() => setEditId(null)}
            onSave={(patch) => saveEdit(inv.id, inv.vendorId || '', patch)}
          />
        );
      })()}
    </div>
  );
}

/* ========================= Edit Invoice Modal ========================= */

function EditInvoiceModal({
  invoice,
  onClose,
  onSave,
}: {
  invoice: ApiInvoice;
  onClose: () => void;
  onSave: (patch: Partial<ApiInvoice>) => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber || '');
  const [date, setDate] = useState(invoice.date ? invoice.date.split('T')[0] : '');
  const [dueDate, setDueDate] = useState(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');
  const [subtotal, setSubtotal] = useState(String(invoice.subtotal || 0));
  const [totalAmount, setTotalAmount] = useState(String(invoice.totalAmount || 0));
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTerms || '');
  const [earlyPayDiscount, setEarlyPayDiscount] = useState(String(invoice.earlyPayDiscount || 0));
  const [lateFee, setLateFee] = useState(String(invoice.lateFee || 0));

  function handleSave() {
    onSave({
      invoiceNumber: invoiceNumber.trim(),
      date: date ? new Date(date).toISOString() : '',
      dueDate: dueDate ? new Date(dueDate).toISOString() : '',
      subtotal: parseFloat(subtotal) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      paymentTerms: paymentTerms || '',
      earlyPayDiscount: parseFloat(earlyPayDiscount) || 0,
      lateFee: parseFloat(lateFee) || 0,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl p-4">
        <h3 className="mb-4 text-lg font-semibold">Edit Invoice</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Invoice #</span>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Total</span>
            <input
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Subtotal</span>
            <input
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Invoice Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-gray-400">Payment Terms</span>
            <input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Early Pay Discount (%)</span>
            <input
              value={earlyPayDiscount}
              onChange={(e) => setEarlyPayDiscount(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Late Fee (%)</span>
            <input
              value={lateFee}
              onChange={(e) => setLateFee(e.target.value)}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
