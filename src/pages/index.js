// src/pages/index.js
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { InputValidator } from '../lib/validators';

export default function Home() {
  const [activeTab, setActiveTab] = useState('demo');
  const [demoForm, setDemoForm] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    orderTotal: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Demo order data for testing
  const demoOrders = [
    {
      orderId: 'ORD-2024-001',
      customerName: 'John Doe',
      customerEmail: 'danny.engelhard@gmail.com',
      items: [
        { name: 'Premium Widget', price: 29.99, quantity: 2 },
        { name: 'Express Shipping', price: 9.99, quantity: 1 }
      ],
      total: 69.97,
      status: 'pending'
    },
    {
      orderId: 'ORD-2024-002',
      customerName: 'Jane Smith',
      customerEmail: 'jane.smith@example.com',
      items: [
        { name: 'Basic Plan', price: 19.99, quantity: 1 },
        { name: 'Add-on Service', price: 15.00, quantity: 2 }
      ],
      total: 49.99,
      status: 'pending'
    }
  ];

  const handleDemoFormChange = (field, value) => {
    setDemoForm(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateDemoForm = () => {
    if (!demoForm.orderId.trim()) return 'Order ID is required';
    if (!demoForm.customerName.trim()) return 'Customer name is required';
    
    const emailError = InputValidator.validateEmail(demoForm.customerEmail);
    if (emailError) return emailError;
    
    if (!demoForm.orderTotal || isNaN(parseFloat(demoForm.orderTotal)) || parseFloat(demoForm.orderTotal) <= 0) {
      return 'Please enter a valid order total';
    }
    
    return null;
  };

  const generatePaymentLink = async () => {
    const validationError = validateDemoForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/generate-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: demoForm.orderId,
          customerEmail: demoForm.customerEmail,
          customerName: demoForm.customerName,
          orderTotal: parseFloat(demoForm.orderTotal)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payment link');
      }

      setGeneratedLink(data.paymentUrl);
      setSuccess('Payment link generated successfully!');
    } catch (error) {
      console.error('Error generating payment link:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendPaymentEmail = async (orderData) => {
    try {
      const response = await fetch('/api/send-payment-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          orderId: orderData.orderId,
          paymentUrl: `${window.location.origin}/payment?orderId=${orderData.orderId}&token=demo-token`,
          orderTotal: orderData.total
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(`Payment email sent to ${orderData.customerEmail}!`);
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

  return (
    <>
      <Head>
        <title>Payment System Dashboard</title>
        <meta name="description" content="Secure order payment processing dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500">
        {/* Header */}
        <div className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🛒</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payment System</h1>
                  <p className="text-sm text-gray-600">Order Payment Processing Dashboard</p>
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
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'demo', label: '🚀 Demo & Testing', icon: '🧪' },
                  { id: 'orders', label: '📦 Sample Orders', icon: '📋' },
                  { id: 'features', label: '⚡ Features', icon: '🔧' },
                  { id: 'docs', label: '📖 Documentation', icon: '📚' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {/* Demo Tab */}
              {activeTab === 'demo' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 Generate Payment Link</h2>
                    <p className="text-gray-600 mb-6">
                      Create a secure payment link for testing the payment flow. This will generate a JWT-secured URL that customers can use to complete their payment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Order Information</h3>
                      
                      <InputField
                        label="Order ID"
                        value={demoForm.orderId}
                        onChange={(value) => handleDemoFormChange('orderId', value)}
                        placeholder="ORD-2024-001"
                        required
                      />

                      <InputField
                        label="Customer Name"
                        value={demoForm.customerName}
                        onChange={(value) => handleDemoFormChange('customerName', value)}
                        placeholder="John Doe"
                        required
                      />

                      <InputField
                        label="Customer Email"
                        type="email"
                        value={demoForm.customerEmail}
                        onChange={(value) => handleDemoFormChange('customerEmail', value)}
                        placeholder="john@example.com"
                        required
                      />

                      <InputField
                        label="Order Total"
                        type="number"
                        value={demoForm.orderTotal}
                        onChange={(value) => handleDemoFormChange('orderTotal', value)}
                        placeholder="69.97"
                        required
                      />

                      <button
                        onClick={generatePaymentLink}
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
                          '🔗 Generate Payment Link'
                        )}
                      </button>
                    </div>

                    {/* Result */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold mb-4">Generated Link</h3>
                      
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
                            <p className="text-sm text-gray-600 mb-2">Payment URL:</p>
                            <div className="bg-gray-100 rounded p-3 font-mono text-xs break-all">
                              {generatedLink}
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={() => copyToClipboard(generatedLink)}
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                              >
                                📋 Copy
                              </button>
                              <Link
                                href={generatedLink}
                                target="_blank"
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                              >
                                🔗 Test Link
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {!generatedLink && !error && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-4xl mb-2">🔗</div>
                          <p>Fill out the form and click generate to create a payment link</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">📦 Sample Orders</h2>
                    <p className="text-gray-600 mb-6">
                      These are sample orders you can use for testing the payment system. Click &quot;Send Payment Email&quot; to simulate the customer flow.
                    </p>
                  </div>

                  <div className="grid gap-6">
                    {demoOrders.map((order) => (
                      <div key={order.orderId} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{order.orderId}</h3>
                            <p className="text-gray-600">{order.customerName} • {order.customerEmail}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">${order.total.toFixed(2)}</div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-medium text-gray-700 mb-2">Items:</h4>
                          <div className="space-y-1">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                                </span>
                                <span className="text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={() => sendPaymentEmail(order)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            📧 Send Payment Email
                          </button>
                          <Link
                            href={`/payment?orderId=${order.orderId}&token=demo-token`}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-center transition-colors"
                          >
                            💳 Test Payment
                          </Link>
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
                      Overview of the payment system&apos;s capabilities and integrations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      {
                        icon: '🔐',
                        title: 'JWT Authentication',
                        description: 'Secure tokenized payment links with expiration handling',
                        status: 'Active'
                      },
                      {
                        icon: '📊',
                        title: 'Google Sheets Integration',
                        description: 'Real-time order data retrieval and status updates',
                        status: 'Active'
                      },
                      {
                        icon: '💳',
                        title: 'AlphaPay Processing',
                        description: 'Secure payment processing with fraud protection',
                        status: 'Active'
                      },
                      {
                        icon: '📧',
                        title: 'Email Notifications',
                        description: 'Automated confirmation and payment request emails',
                        status: 'Active'
                      },
                      {
                        icon: '🛡️',
                        title: 'Input Validation',
                        description: 'Comprehensive validation and XSS protection',
                        status: 'Active'
                      },
                      {
                        icon: '📱',
                        title: 'Responsive Design',
                        description: 'Mobile-friendly interface with modern UI',
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

              {/* Documentation Tab */}
              {activeTab === 'docs' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 API Documentation</h2>
                    <p className="text-gray-600 mb-6">
                      Available API endpoints and their usage examples.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      {
                        method: 'POST',
                        endpoint: '/api/generate-payment-link',
                        description: 'Generate a secure JWT payment link',
                        body: {
                          orderId: 'ORD-12345',
                          customerEmail: 'customer@example.com'
                        }
                      },
                      {
                        method: 'GET',
                        endpoint: '/api/orders/[orderId]',
                        description: 'Fetch order details with token validation',
                        headers: {
                          Authorization: 'Bearer jwt-token'
                        }
                      },
                      {
                        method: 'POST',
                        endpoint: '/api/payment/process',
                        description: 'Process payment and update order status',
                        body: {
                          paymentData: {
                            orderId: 'ORD-12345',
                            amount: 69.97,
                            cardNumber: '4242424242424242'
                          }
                        }
                      },
                      {
                        method: 'POST',
                        endpoint: '/api/send-payment-email',
                        description: 'Send payment notification email',
                        body: {
                          customerEmail: 'customer@example.com',
                          customerName: 'John Doe',
                          orderId: 'ORD-12345',
                          paymentUrl: 'https://app.com/payment?orderId=...'
                        }
                      }
                    ].map((api, index) => (
                      <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6">
                        <div className="flex items-center mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold mr-3 ${
                            api.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {api.method}
                          </span>
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {api.endpoint}
                          </code>
                        </div>
                        <p className="text-gray-600 mb-4">{api.description}</p>
                        
                        {(api.body || api.headers) && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm overflow-x-auto">
                              <code>{JSON.stringify(api.body || api.headers, null, 2)}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                © 2024 Payment System. Powered by Next.js, AlphaPay & Google Sheets.
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>🔒 SSL Secured</span>
                <span>⚡ Real-time Processing</span>
                <span>📧 Email Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}