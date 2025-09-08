export default function OrderDetails({ orderData }) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 mb-8">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        📋 Order Details
      </h3>
      
      <div className="space-y-2 mb-6">
        <p><span className="font-medium">Order ID:</span> {orderData.orderId}</p>
        <p><span className="font-medium">Customer:</span> {orderData.customerName}</p>
      </div>

      <div className="space-y-3">
        {orderData.items.map((item, index) => (
          <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
            <span className="font-medium">
              {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
            </span>
            <span className="text-gray-600">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="flex justify-between items-center py-4 font-bold text-lg bg-white rounded-lg px-4 mt-4">
          <span>Total</span>
          <span>${orderData.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
