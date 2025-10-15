// ===========================
// Updated src/pages/customer/portal.js - Improved Layout & Spacing
// ===========================
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

export default function CustomerPortal() {
  const router = useRouter();
  const [customerData, setCustomerData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardName: ''
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  useEffect(() => {
    if (router.isReady) {
      initializePortal();
    }
  }, [router.isReady]);

  useEffect(() => {
    const total = orders
      .filter(order => selectedOrders.includes(order.orderId))
      .reduce((sum, order) => sum + order.total, 0);
    setGrandTotal(total);
  }, [selectedOrders, orders]);

  const initializePortal = async () => {
    try {
      const { token } = router.query;

      if (!token) {
        throw new Error('Invalid portal link. Please use the link from your email.');
      }

      const response = await fetch('/api/customer/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load orders');
      }

      const data = await response.json();
      setCustomerData(data.customer);
      setOrders(data.orders);
      setSelectedOrders(data.orders.map(o => o.orderId));

    } catch (error) {
      console.error('Portal initialization failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handlePaymentInputChange = (field, value) => {
    if (field === 'cardNumber') {
      value = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19);
    }
    if (field === 'expiry') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/, '$1/').substring(0, 5);
    }
    if (field === 'cvv') {
      value = value.replace(/\D/g, '').substring(0, 4);
    }

    setPaymentData(prev => ({ ...prev, [field]: value }));
    
    if (paymentErrors[field]) {
      setPaymentErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validatePaymentForm = () => {
    const errors = {};
    
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!paymentData.expiry || !/^\d{2}\/\d{2}$/.test(paymentData.expiry)) {
      errors.expiry = 'Please enter expiry in MM/YY format';
    }
    
    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      errors.cvv = 'Please enter a valid CVV';
    }
    
    if (!paymentData.cardName || paymentData.cardName.trim().length < 2) {
      errors.cardName = 'Please enter the name on card';
    }
    
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreditCardPayment = async (e) => {
    e.preventDefault();
    
    if (!validatePaymentForm()) {
      return;
    }

    if (selectedOrders.length === 0) {
      setError('Please select at least one order to pay');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { token } = router.query;

      const response = await fetch('/api/customer/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
          paymentMethod: 'credit_card',
          paymentData: {
            cardNumber: paymentData.cardNumber.replace(/\s/g, ''),
            expiry: paymentData.expiry,
            cvv: paymentData.cvv,
            cardName: paymentData.cardName.trim()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const data = await response.json();
      setPaymentResult({
        ...data.paymentResult,
        paymentMethod: 'Credit Card'
      });
      setPaymentSuccess(true);

    } catch (error) {
      console.error('Payment processing failed:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlternativePayment = async (method) => {
    if (selectedOrders.length === 0) {
      setError('Please select at least one order to pay');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { token } = router.query;

      const response = await fetch('/api/customer/payment/alternative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
          paymentMethod: method
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment status');
      }

      const data = await response.json();
      setPaymentResult({
        ...data.result,
        paymentMethod: method === 'cash' ? 'Cash' : 'E-Transfer'
      });
      setPaymentSuccess(true);

    } catch (error) {
      console.error('Payment update failed:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    initializePortal();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <LoadingSpinner message="Loading your orders..." />
        </div>
      </div>
    );
  }

  if (error && !orders.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <ErrorMessage message={error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <>
        <Head>
          <title>Payment Confirmed - Customer Portal</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="text-center space-y-6">
                <div className="text-7xl">✅</div>
                
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    {paymentResult.paymentMethod === 'Credit Card' ? 'Payment Successful!' : 'Payment Method Confirmed!'}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {paymentResult.ordersPaid || selectedOrders.length} order{(paymentResult.ordersPaid || selectedOrders.length) > 1 ? 's have' : ' has'} been processed
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-8 my-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Payment Method</p>
                      <p className="font-semibold text-xl">{paymentResult.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Orders</p>
                      <p className="font-semibold text-xl">{paymentResult.ordersPaid || selectedOrders.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Total Amount</p>
                      <p className="font-semibold text-xl text-green-600">${grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {paymentResult.paymentMethod === 'E-Transfer' && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6 text-left rounded-lg my-6">
                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                      <span className="text-2xl">💳</span>
                      E-Transfer Instructions
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold flex-shrink-0">1.</span>
                        <span>Send e-transfer to: <strong>payments@example.com</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold flex-shrink-0">2.</span>
                        <span>Amount: <strong>${grandTotal.toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold flex-shrink-0">3.</span>
                        <span>Include your name and order ID(s) in the message</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-blue-600 font-bold flex-shrink-0">4.</span>
                        <span>We&apos;ve been notified and will confirm once payment is received</span>
                      </li>
                    </ul>
                  </div>
                )}

                {paymentResult.paymentMethod === 'Cash' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 text-left rounded-lg my-6">
                    <h3 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2 text-lg">
                      <span className="text-2xl">💵</span>
                      Cash Payment Instructions
                    </h3>
                    <ul className="text-sm text-yellow-800 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-yellow-600 font-bold flex-shrink-0">•</span>
                        <span>Please bring <strong>${grandTotal.toFixed(2)}</strong> in cash when picking up your order</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-yellow-600 font-bold flex-shrink-0">•</span>
                        <span>Payment will be collected at the time of pickup</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-yellow-600 font-bold flex-shrink-0">•</span>
                        <span>We&apos;ve been notified of your payment preference</span>
                      </li>
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 text-left rounded-lg my-6">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                    <span className="text-2xl">📦</span>
                    What&apos;s Next?
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                      <span>Confirmation email sent to {customerData.email}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                      <span>All orders are being processed</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                      <span>Pickup instructions will be sent within 2-3 business days</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                      <span>You&apos;ll receive separate notifications for each order when ready</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="mt-8 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  Return to Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <Head>
          <title>No Unpaid Orders - Customer Portal</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">All Caught Up!</h2>
            <p className="text-lg text-gray-600">
              You don&apos;t have any unpaid orders at the moment. Thank you for being a valued customer!
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Payment Portal - {customerData?.name || 'Customer'}</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                  Welcome, {customerData?.name || customerData?.email}
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  You have {orders.length} unpaid order{orders.length > 1 ? 's' : ''} • Select orders to pay
                </p>
              </div>
              <div className="text-left md:text-right bg-green-50 rounded-xl p-4 md:p-6">
                <p className="text-sm text-gray-600 mb-1">Selected Total</p>
                <p className="text-4xl md:text-5xl font-bold text-green-600">
                  ${grandTotal.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedOrders.length} of {orders.length} selected
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg shadow-md">
              <p className="text-red-700 text-lg">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Orders List */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Your Orders</h2>
                  <button
                    onClick={() => {
                      if (selectedOrders.length === orders.length) {
                        setSelectedOrders([]);
                      } else {
                        setSelectedOrders(orders.map(o => o.orderId));
                      }
                    }}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors"
                  >
                    {selectedOrders.length === orders.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-6">
                  {orders.map((order) => {
                    const isSelected = selectedOrders.includes(order.orderId);
                    return (
                      <div
                        key={order.orderId}
                        className={`border-2 rounded-2xl p-6 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => toggleOrderSelection(order.orderId)}
                      >
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOrderSelection(order.orderId)}
                              className="w-6 h-6 text-blue-600 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="space-y-1">
                              <h3 className="font-bold text-gray-900 text-xl">
                                {order.orderId}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Created: {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                              {order.notes && (
                                <p className="text-sm text-blue-600 italic mt-2">
                                  Note: {order.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="text-3xl font-bold text-gray-900">
                              ${order.total.toFixed(2)}
                            </p>
                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="border-t-2 border-gray-200 pt-4 mt-4">
                          <div className="space-y-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm py-2">
                                <span className="text-gray-700 font-medium">
                                  {item.name} {item.quantity > 1 && `x${item.quantity}`}
                                </span>
                                <span className="text-gray-900 font-semibold">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 md:p-8 border-2 border-blue-200 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3 text-xl">
                  <span className="text-2xl">💡</span>
                  Payment Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-base py-2">
                    <span className="text-gray-700">Orders selected:</span>
                    <span className="font-semibold text-lg">{selectedOrders.length}</span>
                  </div>
                  <div className="flex justify-between text-base py-2">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-lg">${grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-blue-300 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 text-lg">Total to Pay:</span>
                      <span className="font-bold text-4xl text-green-600">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="xl:col-span-1">
              <div className="sticky top-6">
                {selectedOrders.length > 0 ? (
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-xl">
                    <h3 className="text-2xl font-bold mb-8">💳 Payment Method</h3>
                    
                    {/* Payment Method Selection */}
                    <div className="mb-8 space-y-4">
                      <button
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === 'credit_card'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">💳</div>
                          <div>
                            <div className="font-semibold text-lg">Credit/Debit Card</div>
                            <div className="text-sm text-gray-600 mt-1">Pay securely online</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('etransfer')}
                        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === 'etransfer'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">📧</div>
                          <div>
                            <div className="font-semibold text-lg">E-Transfer</div>
                            <div className="text-sm text-gray-600 mt-1">Send via Interac</div>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                          paymentMethod === 'cash'
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">💵</div>
                          <div>
                            <div className="font-semibold text-lg">Cash</div>
                            <div className="text-sm text-gray-600 mt-1">Pay at pickup</div>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Credit Card Form */}
                    {paymentMethod === 'credit_card' && (
                      <form onSubmit={handleCreditCardPayment} className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Card Number
                          </label>
                          <input
                            type="text"
                            value={paymentData.cardNumber}
                            onChange={(e) => handlePaymentInputChange('cardNumber', e.target.value)}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className={`w-full px-4 py-4 border-2 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors ${
                              paymentErrors.cardNumber ? 'border-red-400' : 'border-gray-300'
                            }`}
                            required
                          />
                          {paymentErrors.cardNumber && (
                            <p className="text-red-600 text-sm mt-2">{paymentErrors.cardNumber}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Expiry
                            </label>
                            <input
                              type="text"
                              value={paymentData.expiry}
                              onChange={(e) => handlePaymentInputChange('expiry', e.target.value)}
                              placeholder="MM/YY"
                              maxLength={5}
                              className={`w-full px-4 py-4 border-2 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors ${
                                paymentErrors.expiry ? 'border-red-400' : 'border-gray-300'
                              }`}
                              required
                            />
                            {paymentErrors.expiry && (
                              <p className="text-red-600 text-sm mt-2">{paymentErrors.expiry}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              CVV
                            </label>
                            <input
                              type="text"
                              value={paymentData.cvv}
                              onChange={(e) => handlePaymentInputChange('cvv', e.target.value)}
                              placeholder="123"
                              maxLength={4}
                              className={`w-full px-4 py-4 border-2 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors ${
                                paymentErrors.cvv ? 'border-red-400' : 'border-gray-300'
                              }`}
                              required
                            />
                            {paymentErrors.cvv && (
                              <p className="text-red-600 text-sm mt-2">{paymentErrors.cvv}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name on Card
                          </label>
                          <input
                            type="text"
                            value={paymentData.cardName}
                            onChange={(e) => handlePaymentInputChange('cardName', e.target.value)}
                            placeholder="John Doe"
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors ${
                              paymentErrors.cardName ? 'border-red-400' : 'border-gray-300'
                            }`}
                            required
                          />
                          {paymentErrors.cardName && (
                            <p className="text-red-600 text-xs mt-1">{paymentErrors.cardName}</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isProcessing}
                          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                            isProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:-translate-y-0.5 shadow-lg hover:shadow-xl'
                          } text-white`}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              Processing Payment...
                            </span>
                          ) : (
                            `🔒 Pay ${grandTotal.toFixed(2)} Securely`
                          )}
                        </button>
                      </form>
                    )}

                    {/* E-Transfer Option */}
                    {paymentMethod === 'etransfer' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">E-Transfer Instructions:</h4>
                          <ul className="text-sm text-blue-800 space-y-2">
                            <li>• Send to: <strong>payments@example.com</strong></li>
                            <li>• Amount: <strong>${grandTotal.toFixed(2)}</strong></li>
                            <li>• Include your name and order ID(s)</li>
                          </ul>
                        </div>

                        <button
                          onClick={() => handleAlternativePayment('etransfer')}
                          disabled={isProcessing}
                          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                            isProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:-translate-y-0.5 shadow-lg hover:shadow-xl'
                          } text-white`}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              Confirming...
                            </span>
                          ) : (
                            '✅ I Have Sent E-Transfer'
                          )}
                        </button>

                        <p className="text-xs text-gray-600 text-center">
                          Click to confirm you&apos;ll pay via e-transfer. We&apos;ll be notified and will process your order once payment is received.
                        </p>
                      </div>
                    )}

                    {/* Cash Option */}
                    {paymentMethod === 'cash' && (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-900 mb-2">Cash Payment:</h4>
                          <ul className="text-sm text-yellow-800 space-y-2">
                            <li>• Bring <strong>${grandTotal.toFixed(2)}</strong> in cash</li>
                            <li>• Pay at pickup location</li>
                            <li>• Please have exact change if possible</li>
                          </ul>
                        </div>

                        <button
                          onClick={() => handleAlternativePayment('cash')}
                          disabled={isProcessing}
                          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                            isProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:-translate-y-0.5 shadow-lg hover:shadow-xl'
                          } text-white`}
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              Confirming...
                            </span>
                          ) : (
                            '💵 I Will Pay Cash at Pickup'
                          )}
                        </button>

                        <p className="text-xs text-gray-600 text-center">
                          Click to confirm you&apos;ll pay cash at pickup. We&apos;ll process your order and send pickup instructions.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center text-sm text-gray-600">
                      🛡️ Your information is secured with 256-bit SSL encryption
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-gray-200">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Select Orders</h3>
                    <p className="text-sm text-gray-600">
                      Select at least one order to proceed with payment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
