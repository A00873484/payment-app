// ===========================
// src/pages/index.js - Complete Dashboard Page
// ===========================
import { useSession, signOut } from "next-auth/react";
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('demo');
  const [demoForm, setDemoForm] = useState({
    customerEmail: '',
    customerName: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Demo customer data
  const demoCustomers = [
    {
      email: 'john@example.com',
      name: 'John Doe',
      unpaidOrders: 3,
      totalAmount: 164.95,
      orders: ['ORD-2024-001', 'ORD-2024-005', 'ORD-2024-008']
    },
    {
      email: 'jane@example.com',
      name: 'Jane Smith',
      unpaidOrders: 1,
      totalAmount: 300.00,
      orders: ['ORD-2024-002']
    }
  ];

  const handleDemoFormChange = (field, value) => {
    setDemoForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateDemoForm = () => {
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
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendPortalEmail = async (customer) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/customer/send-portal-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: customer.email,
          customerName: customer.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(`Portal link email sent to ${customer.email}!`);
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error.message);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false }) => (
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
                <div className="text-3xl mr-3">👨‍💼</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600">Payment Portal Management</p>
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
                          alt={session.user.name}
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
          {/* Header */}
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
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🔒 Secure
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✅ Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap space-x-4 md:space-x-8 px-6">
                  {[
                    { id: 'demo', label: 'Generate Portal Links', icon: '🔗' },
                    { id: 'customers', label: 'Demo Customers', icon: '👥' },
                    { id: 'features', label: 'Features', icon: '⚡' },
                    { id: 'api', label: 'API Reference', icon: '💻' }
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

                {/* Customers Tab */}
                {activeTab === 'customers' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Demo Customers</h2>
                      <p className="text-gray-600 mb-6">
                        Test customers with unpaid orders. Send them a portal link to test the multi-order payment flow.
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <p className="text-green-700 text-sm">{success}</p>
                      </div>
                    )}

                    <div className="grid gap-6">
                      {demoCustomers.map((customer, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
                              <p className="text-gray-600">{customer.email}</p>
                            </div>
                            <div className="text-left md:text-right">
                              <div className="text-2xl font-bold text-red-600">${customer.totalAmount.toFixed(2)}</div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {customer.unpaidOrders} unpaid
                              </span>
                            </div>
                          </div>

                          <div className="mb-4 bg-gray-50 rounded p-3">
                            <h4 className="font-medium text-gray-700 mb-2 text-sm">Unpaid Orders:</h4>
                            <div className="flex flex-wrap gap-2">
                              {customer.orders.map((orderId) => (
                                <span key={orderId} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                                  {orderId}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => sendPortalEmail(customer)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              📧 Send Portal Email
                            </button>
                            <button
                              onClick={() => {
                                setDemoForm({ customerEmail: customer.email, customerName: customer.name });
                                setActiveTab('demo');
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                              🔗 Generate Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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