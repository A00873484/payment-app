export default function PaymentSuccess({ paymentResult, orderData }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6">✅</div>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Payment Successful!</h2>
      <p className="text-lg text-gray-600 mb-8">
        Thank you for your payment. Your order has been confirmed.
      </p>
      
      <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto">
        <h3 className="text-xl font-semibold mb-4">Payment Details</h3>
        <div className="space-y-3 text-left">
          <div className="flex justify-between">
            <span className="font-medium">Payment ID</span>
            <span className="text-gray-600">{paymentResult.paymentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Order ID</span>
            <span className="text-gray-600">{orderData.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Amount Paid</span>
            <span className="text-gray-600">${paymentResult.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
        <p className="text-sm text-gray-700">
          📧 A confirmation email has been sent to {orderData.customerEmail}
          <br />
          📦 You will receive pickup instructions within 2-3 business days.
        </p>
      </div>
    </div>
  );
}
