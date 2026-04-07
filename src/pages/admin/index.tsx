// ===========================
// src/pages/admin/index.tsx - Complete Dashboard Page
// ===========================
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { errorMessage } from "@/lib/utils";
import OrderSearch from "@/components/OrderSearch";

interface DemoForm {
  customerEmail: string;
  customerName: string;
}

type TabId = 'demo' | 'customers' | 'drive' | 'features' | 'api';

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('demo');
  const [demoForm, setDemoForm] = useState<DemoForm>({
    customerEmail: '',
    customerName: ''
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Import Orders tab state
  const [drivesyncing, setDriveSyncing] = useState<boolean>(false);
  const [driveSyncResults, setDriveSyncResults] = useState<{
    filesProcessed: number;
    results: { fileName: string; success: boolean; format?: string; recordsAdded?: number; recordsUpdated?: number; recordsFailed?: number; error?: string }[];
  } | null>(null);

  type UploadResult = { fileName: string; success: boolean; format?: string; recordsAdded?: number; recordsUpdated?: number; recordsFailed?: number; error?: string };
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  const handleDemoFormChange = (field: keyof DemoForm, value: string) => {
    setDemoForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateDemoForm = (): string | null => {
    if (!demoForm.customerEmail.trim()) {
      return 'Customer email is required';
    }
    if (!validateEmail(demoForm.customerEmail)) {
      return 'Please enter a valid email address';
    }
    if (!demoForm.customerName.trim()) {
      return 'Customer name is required';
    }
    return null;
  };

  const generatePortalLink = async () => {
    const validationError = validateDemoForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/customer/portal-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: demoForm.customerEmail,
          customerName: demoForm.customerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate portal link');
      }

      setGeneratedLink(data.portalUrl);
      setSuccess('Customer portal link generated successfully!');
    } catch (error) {
      console.error('Error generating portal link:', error);
      setError(errorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  type SyncResult = { fileName: string; success: boolean; format?: string; recordsAdded?: number; recordsUpdated?: number; recordsFailed?: number; error?: string };

  const ResultsTable = ({ results }: { results: SyncResult[] }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
      {results.map((r, i) => (
        <div key={i} className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-gray-900 text-sm truncate">{r.fileName}</p>
            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              r.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {r.success ? 'Success' : 'Failed'}
            </span>
          </div>
          {r.success && (
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
              {r.format && <span>Format: <strong className="text-gray-700">{r.format}</strong></span>}
              <span>+{r.recordsAdded ?? 0} added</span>
              <span>{r.recordsUpdated ?? 0} updated</span>
              {(r.recordsFailed ?? 0) > 0 && <span className="text-red-600">{r.recordsFailed} failed</span>}
            </div>
          )}
          {r.error && (
            <pre className="mt-2 text-xs text-red-700 bg-red-50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {r.error}
            </pre>
          )}
        </div>
      ))}
    </div>
  );

  const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false }: InputFieldProps) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        required={required}
      />
    </div>
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // This should not happen due to middleware, but just in case
  if (status === "unauthenticated") {
    console.log(status)
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Payment Portal</title>
        <meta name="description" content="Multi-order payment system dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500">
        {/* Header with User Info */}
        <div className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="text-3xl mr-3">💳</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customer Payment Portal</h1>
                  <p className="text-sm text-gray-600">Multi-Order Payment System</p>
                </div>
              </div>
              
              {/* Admin User Menu */}
              <div className="flex items-center space-x-4">
                {session?.user && (
                  <>
                    <div className="flex items-center gap-3">
                      {session.user.image && (
                        <img 
                          src={session.user.image} 
                          alt={session.user.name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
                        <p className="text-xs text-gray-600">{session.user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Admin
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: '/admin/signin' })}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500">
          
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap space-x-4 md:space-x-8 px-6">
                  {[
                    { id: 'demo' as const, label: 'Generate Portal Links', icon: '🔗' },
                    { id: 'customers' as const, label: 'Customers', icon: '👥' },
                    { id: 'drive' as const, label: 'Import Orders', icon: '📥' },
                    { id: 'features' as const, label: 'Features', icon: '⚡' },
                    { id: 'api' as const, label: 'API Reference', icon: '💻' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-3 md:px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6 md:p-8">
                {/* Demo Tab */}
                {activeTab === 'demo' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">🔗 Generate Customer Portal Link</h2>
                      <p className="text-gray-600 mb-6">
                        Create a secure portal link for customers to view and pay all their unpaid orders in one transaction.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Form */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                        
                        <InputField
                          label="Customer Email"
                          type="email"
                          value={demoForm.customerEmail}
                          onChange={(value) => handleDemoFormChange('customerEmail', value)}
                          placeholder="john@example.com"
                          required
                        />

                        <InputField
                          label="Customer Name"
                          value={demoForm.customerName}
                          onChange={(value) => handleDemoFormChange('customerName', value)}
                          placeholder="John Doe"
                          required
                        />

                        <button
                          onClick={generatePortalLink}
                          disabled={isGenerating}
                          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                            isGenerating
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                          } text-white`}
                        >
                          {isGenerating ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </span>
                          ) : (
                            '🔗 Generate Portal Link'
                          )}
                        </button>

                        <div className="mt-4 text-xs text-gray-600 bg-blue-50 rounded p-3">
                          <p><strong>What this does:</strong></p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Creates a secure 30-day link</li>
                            <li>Shows all unpaid orders for this customer</li>
                            <li>Allows payment of multiple orders at once</li>
                            <li>Sends confirmation email after payment</li>
                          </ul>
                        </div>
                      </div>

                      {/* Result */}
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Generated Portal Link</h3>
                        
                        {error && (
                          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded">
                            <p className="text-red-700 text-sm">{error}</p>
                          </div>
                        )}

                        {success && (
                          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded">
                            <p className="text-green-700 text-sm">{success}</p>
                          </div>
                        )}

                        {generatedLink && (
                          <div className="space-y-4">
                            <div className="bg-white border rounded-lg p-4">
                              <p className="text-sm text-gray-600 mb-2">Portal URL:</p>
                              <div className="bg-gray-100 rounded p-3 font-mono text-xs break-all">
                                {generatedLink}
                              </div>
                              <div className="flex space-x-2 mt-3">
                                <button
                                  onClick={() => copyToClipboard(generatedLink)}
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                >
                                  📋 Copy Link
                                </button>
                                <Link
                                  href={generatedLink}
                                  target="_blank"
                                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors inline-block"
                                >
                                  🔗 Open Portal
                                </Link>
                              </div>
                            </div>

                            <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                              <p className="text-sm text-purple-900">
                                <strong>💡 Next Steps:</strong>
                              </p>
                              <ul className="text-xs text-purple-800 mt-2 space-y-1">
                                <li>• Send this link to the customer via email</li>
                                <li>• Customer clicks link to view all unpaid orders</li>
                                <li>• Customer selects which orders to pay</li>
                                <li>• One payment processes all selected orders</li>
                                <li>• Confirmation email sent automatically</li>
                              </ul>
                            </div>
                          </div>
                        )}

                        {!generatedLink && !error && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">🔗</div>
                            <p>Fill out the form and click generate to create a portal link</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Customers Tab - Now using OrderSearch component */}
                {activeTab === 'customers' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Order Management</h2>
                      <p className="text-gray-600 mb-6">
                        Search for orders, send payment emails, and manage customer orders.
                      </p>
                    </div>

                    <OrderSearch 
                      isAdminMode={true}
                      features={{
                        phoneSearch: true,
                        emailActions: true,
                        generatePaymentLink: true,
                        exportData: true
                      }}
                      className="p-0"
                    />
                  </div>
                )}

                {/* Import Orders Tab */}
                {activeTab === 'drive' && (() => {
                  const processFile = async (file: File) => {
                    return new Promise<{ fileName: string; success: boolean; format?: string; recordsAdded?: number; recordsUpdated?: number; recordsFailed?: number; error?: string }>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const base64 = (e.target?.result as string).split(',')[1];
                          const res = await fetch('/api/sync/upload-sheet', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filename: file.name, content: base64 }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Upload failed');
                          resolve({ ...data, fileName: file.name });
                        } catch (err) {
                          resolve({ fileName: file.name, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  };

                  const handleFiles = async (files: FileList | null) => {
                    if (!files || files.length === 0) return;
                    const valid = Array.from(files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
                    if (valid.length === 0) { setError('Only .xlsx and .xls files are supported'); return; }
                    setUploading(true);
                    setUploadResults([]);
                    setError('');
                    setSuccess('');
                    const results = await Promise.all(valid.map(processFile));
                    setUploadResults(results);
                    const failed = results.filter(r => !r.success).length;
                    setSuccess(failed === 0
                      ? `Processed ${results.length} file(s) successfully.`
                      : `Processed ${results.length} file(s): ${results.length - failed} ok, ${failed} failed.`
                    );
                    setUploading(false);
                  };

                  return (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">📥 Import Orders</h2>
                        <p className="text-gray-600">
                          Import orders from Excel files. Drag and drop files below, or process files already in the
                          Google Drive Unprocessed folder.
                        </p>
                      </div>

                      {/* ── Drag & Drop Upload ── */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Upload File</h3>
                        <div
                          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                            dragOver
                              ? 'border-blue-500 bg-blue-50'
                              : uploading
                              ? 'border-gray-300 bg-gray-50'
                              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                          }`}
                          onClick={() => { if (!uploading) document.getElementById('file-upload-input')?.click(); }}
                        >
                          <input
                            id="file-upload-input"
                            type="file"
                            accept=".xlsx,.xls"
                            multiple
                            className="hidden"
                            onChange={e => handleFiles(e.target.files)}
                          />
                          {uploading ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                              <p className="text-gray-600 font-medium">Processing file(s)…</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 pointer-events-none">
                              <div className={`text-5xl transition-transform ${dragOver ? 'scale-125' : ''}`}>
                                {dragOver ? '📂' : '📄'}
                              </div>
                              <p className="text-gray-700 font-semibold text-lg">
                                {dragOver ? 'Drop to import' : 'Drag & drop Excel files here'}
                              </p>
                              <p className="text-gray-500 text-sm">or click to browse — .xlsx and .xls supported</p>
                            </div>
                          )}
                        </div>

                        {error && (
                          <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                            <p className="text-red-700 text-sm">{error}</p>
                          </div>
                        )}
                        {success && (
                          <div className="mt-3 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                            <p className="text-green-700 text-sm">{success}</p>
                          </div>
                        )}
                      </div>

                      {/* ── Upload results ── */}
                      {uploadResults.length > 0 && (
                        <ResultsTable results={uploadResults} />
                      )}

                      {/* ── Drive Folder Sync ── */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Google Drive Folder</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Process all files in <strong>Ovosky_Orders/Unprocessed</strong>.
                          Successfully processed files are moved to <strong>Processed</strong>. Errors trigger an admin email.
                        </p>
                        <button
                          onClick={async () => {
                            setDriveSyncing(true);
                            setDriveSyncResults(null);
                            setError('');
                            setSuccess('');
                            try {
                              const res = await fetch('/api/sync/drive-folders', { method: 'POST' });
                              const data = await res.json();
                              if (!res.ok && res.status !== 207) throw new Error(data.error || 'Sync failed');
                              setDriveSyncResults(data);
                              const failed = data.results.filter((r: { success: boolean }) => !r.success).length;
                              setSuccess(failed === 0
                                ? `Processed ${data.filesProcessed} file(s) successfully.`
                                : `Processed ${data.filesProcessed} file(s): ${data.filesProcessed - failed} ok, ${failed} failed.`
                              );
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Unknown error');
                            } finally {
                              setDriveSyncing(false);
                            }
                          }}
                          disabled={drivesyncing}
                          className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                            drivesyncing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {drivesyncing ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              Processing…
                            </span>
                          ) : '📂 Process Unprocessed Folder'}
                        </button>
                      </div>

                      {driveSyncResults && (
                        driveSyncResults.filesProcessed === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-2">📭</div>
                            <p>No files found in the Unprocessed folder.</p>
                          </div>
                        ) : (
                          <ResultsTable results={driveSyncResults.results} />
                        )
                      )}
                    </div>
                  );
                })()}

                {/* Features Tab */}
                {activeTab === 'features' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ System Features</h2>
                      <p className="text-gray-600 mb-6">
                        Overview of the multi-order payment system capabilities.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        {
                          icon: '🔗',
                          title: 'Customer Portal Links',
                          description: '30-day secure links for customer payment access',
                          status: 'Active'
                        },
                        {
                          icon: '📦',
                          title: 'Multi-Order Display',
                          description: 'Shows all unpaid orders for a customer at once',
                          status: 'Active'
                        },
                        {
                          icon: '💳',
                          title: 'Batch Payment Processing',
                          description: 'Pay for multiple orders in a single transaction',
                          status: 'Active'
                        },
                        {
                          icon: '✅',
                          title: 'Order Selection',
                          description: 'Customers choose which orders to pay now',
                          status: 'Active'
                        },
                        {
                          icon: '📧',
                          title: 'Consolidated Emails',
                          description: 'Single confirmation email for all paid orders',
                          status: 'Active'
                        },
                        {
                          icon: '🛡️',
                          title: 'Secure Tokens',
                          description: 'JWT-based authentication with expiration',
                          status: 'Active'
                        },
                        {
                          icon: '🔐',
                          title: 'No Login Required',
                          description: 'Frictionless access via secure link only',
                          status: 'Active'
                        },
                        {
                          icon: '📊',
                          title: 'Real-time Totals',
                          description: 'Dynamic calculation of grand total',
                          status: 'Active'
                        },
                        {
                          icon: '🚀',
                          title: 'Instant Processing',
                          description: 'Immediate order status updates',
                          status: 'Active'
                        }
                      ].map((feature, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                          <div className="text-3xl mb-3">{feature.icon}</div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                          <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {feature.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* API Tab */}
                {activeTab === 'api' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">📡 API Reference</h2>
                      <p className="text-gray-600 mb-6">
                        API endpoints for customer portal management and multi-order payments.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {[
                        {
                          method: 'POST',
                          endpoint: '/api/customer/portal-link',
                          description: 'Generate a customer portal link',
                          auth: 'API Key (Bearer Token)',
                          body: {
                            customerEmail: 'john@example.com',
                            customerName: 'John Doe'
                          },
                          response: {
                            success: true,
                            portalUrl: 'http://localhost:3000/customer/portal?token=...',
                            expiresIn: '30d'
                          }
                        },
                        {
                          method: 'POST',
                          endpoint: '/api/customer/send-portal-email',
                          description: 'Generate and send portal link via email',
                          auth: 'API Key (Bearer Token)',
                          body: {
                            customerEmail: 'john@example.com',
                            customerName: 'John Doe'
                          },
                          response: {
                            success: true,
                            message: 'Portal link email sent successfully'
                          }
                        },
                        {
                          method: 'GET',
                          endpoint: '/api/customer/orders',
                          description: 'Get all unpaid orders for a customer',
                          auth: 'Customer Portal Token',
                          body: null,
                          response: {
                            success: true,
                            orders: [],
                            summary: { totalOrders: 3, grandTotal: 164.95 }
                          }
                        },
                        {
                          method: 'POST',
                          endpoint: '/api/customer/payment',
                          description: 'Process payment for multiple orders',
                          auth: 'Customer Portal Token',
                          body: {
                            orderIds: ['ORD-2024-001', 'ORD-2024-005'],
                            paymentData: { 
                              cardNumber: '4242424242424242',
                              expiry: '12/25',
                              cvv: '123',
                              cardName: 'John Doe'
                            }
                          },
                          response: {
                            success: true,
                            paymentResult: {
                              paymentId: 'alphapay_123456',
                              amount: 114.96,
                              ordersPaid: 2
                            }
                          }
                        }
                      ].map((api, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              api.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {api.method}
                            </span>
                            <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded flex-1 min-w-0 break-all">
                              {api.endpoint}
                            </code>
                          </div>
                          <p className="text-gray-600 mb-3">{api.description}</p>
                          <p className="text-sm text-gray-500 mb-3">
                            <strong>Auth:</strong> {api.auth}
                          </p>
                          
                          {api.body && (
                            <div className="bg-gray-900 rounded-lg p-4 mb-3 overflow-x-auto">
                              <p className="text-gray-400 text-xs mb-2">Request Body:</p>
                              <pre className="text-sm text-green-400">
                                <code>{JSON.stringify(api.body, null, 2)}</code>
                              </pre>
                            </div>
                          )}

                          {api.response && (
                            <div className="bg-green-900 rounded-lg p-4 overflow-x-auto">
                              <p className="text-green-400 text-xs mb-2">Response:</p>
                              <pre className="text-sm text-green-300">
                                <code>{JSON.stringify(api.response, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                      <h3 className="font-semibold text-blue-900 mb-2">🔑 Demo API Key</h3>
                      <code className="text-sm bg-white px-3 py-2 rounded block text-gray-800 font-mono break-all">
                        dem_0adm1n01_X9aB7cD2LkQ8rT1vM3nZ6pW4sY0uJhEb
                      </code>
                      <p className="text-xs text-blue-800 mt-2">
                        Use this API key for testing. Replace with your actual key in production.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white border-t mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="text-sm text-gray-500">
                  © 2024 Customer Payment Portal. Multi-Order Payment System.
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span>🔒 SSL Secured</span>
                  <span>⚡ Instant Processing</span>
                  <span>📧 Auto Confirmations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}