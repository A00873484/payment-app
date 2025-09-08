import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import OrderDetails from '../components/OrderDetails';
import PaymentForm from '../components/PaymentForm';
import PaymentSuccess from '../components/PaymentSuccess';

export default function PaymentPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.isReady) {
      initializePayment();
    }
  }, [router.isReady]);

  const initializePayment = async () => {
    try {
      const { orderId, token } = router.query;

      if (!orderId || !token) {
        throw new Error('Missing required parameters. Please check your payment link.');
      }

      // Fetch order details
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load order details');
      }

      const data = await response.json();
      setOrderData(data);

    } catch (error) {
      console.error('Payment initialization failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    try {
      const { token } = router.query;
      
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentData: {
            orderId: orderData.orderId,
            amount: orderData.total,
            currency: 'USD',
            ...result
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const data = await response.json();
      setPaymentResult(data.paymentResult);

    } catch (error) {
      console.error('Payment completion failed:', error);
      setError(error.message);
    }
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    initializePayment();
  };

  return (
    <>
      <Head>
        <title>Order Payment - Secure Checkout</title>
        <meta name="description" content="Complete your order payment securely" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-t-2xl p-8 text-center shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
              🛒 Order Payment
            </h1>
            <p className="text-gray-600">Secure checkout powered by AlphaPay</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-b-2xl shadow-lg p-8">
            {loading && (
              <LoadingSpinner message="Loading your order details..." />
            )}

            {error && (
              <ErrorMessage message={error} onRetry={handleRetry} />
            )}

            {paymentResult && orderData && (
              <PaymentSuccess 
                paymentResult={paymentResult} 
                orderData={orderData} 
              />
            )}

            {!loading && !error && !paymentResult && orderData && (
              <>
                <OrderDetails orderData={orderData} />
                <PaymentForm 
                  orderData={orderData}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}