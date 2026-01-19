import { useState, useEffect } from "react";
import Head from "next/head";

export default function AdminOrderSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allResults, setAllResults] = useState([]); // Store all search results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Debounce input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setAllResults([]);
      setExpandedOrders(new Set());
      setSelectedCustomer(null);
      setHideCompleted(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/orders/search?query=${encodeURIComponent(debouncedQuery)}`
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Search failed");
        }

        const data = await res.json();
        console.log(data.results);
        setAllResults(data.results);
        setResults(data.results);
        setSelectedCustomer(null); // Reset customer filter on new search
        setHideCompleted(false); // Reset shipping filter on new search
      } catch (err) {
        console.error("Search error:", err);
        setError(err.message);
        setResults([]);
        setAllResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Filter results when customer or shipping filter changes
  useEffect(() => {
    let filtered = allResults;

    // Filter by customer
    if (selectedCustomer) {
      filtered = filtered.filter(order => order.name === selectedCustomer);
    }

    // Filter out completed items
    if (hideCompleted) {
      filtered = filtered.filter(order => 
        order.shippingStatus !== '已發貨' && 
        order.shippingStatus !== 'Shipped' &&
        order.shippingStatus !== 'Completed'
      );
    }

    setResults(filtered);
  }, [selectedCustomer, hideCompleted, allResults]);

  const toggleOrder = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleCustomerClick = (customerName) => {
    if (selectedCustomer === customerName) {
      setSelectedCustomer(null); // Unfilter if clicking the same customer
    } else {
      setSelectedCustomer(customerName);
    }
  };

  const toggleShippingFilter = () => {
    setHideCompleted(!hideCompleted);
  };

  return (
    <>
      <Head>
        <title>Admin Order Search</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              🔎 Search Orders
            </h1>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by WeChat ID / Name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white shadow-sm rounded-lg p-8">
              <div className="text-blue-600 font-medium text-center">
                Searching…
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!loading && debouncedQuery && results.length === 0 && !error && (
            <div className="bg-white shadow-sm rounded-lg p-8">
              <p className="text-gray-500 text-center">
                No orders found.
              </p>
            </div>
          )}

          {/* Results Table */}
          {allResults.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">
                        {/* Expand icon column */}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th 
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                          selectedCustomer 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedCustomer(null)}
                        title={selectedCustomer ? "Click to clear customer filter" : "Click customer name to filter"}
                      >
                        Customer {selectedCustomer && '✓'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Packed
                      </th>
                      <th 
                        className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                          hideCompleted 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={toggleShippingFilter}
                        title={hideCompleted ? "Click to show completed orders" : "Click to hide completed orders"}
                      >
                        Shipping {hideCompleted && '✓'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((order, index) => (
                      <OrderRow 
                        key={index} 
                        order={order} 
                        isExpanded={expandedOrders.has(order.orderId)}
                        onToggle={() => toggleOrder(order.orderId)}
                        onCustomerClick={handleCustomerClick}
                        isCustomerSelected={selectedCustomer === order.name}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Results Count */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {results.length} of {allResults.length} {allResults.length === 1 ? 'order' : 'orders'}
                  {selectedCustomer && (
                    <span className="ml-2 text-blue-600">
                      • Filtered by customer: {selectedCustomer}
                    </span>
                  )}
                  {hideCompleted && (
                    <span className="ml-2 text-purple-600">
                      • Hiding completed orders
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Status badge component
function StatusBadge({ status, type }) {
  const getStatusColor = (status, type) => {
    if (type === 'payment') {
      return status === '未付款' || status === 'Unpaid'
        ? 'bg-red-100 text-red-800'
        : 'bg-green-100 text-green-800';
    }
    if (type === 'packing') {
      return status === '未裝箱' || status === 'Not Packed'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-blue-100 text-blue-800';
    }
    if (type === 'shipping') {
      return status === '未發貨' || status === 'Not Shipped'
        ? 'bg-gray-100 text-gray-800'
        : 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status, type)}`}>
      {status}
    </span>
  );
}

// Table row for each order with expandable order items
function OrderRow({ order, isExpanded, onToggle, onCustomerClick, isCustomerSelected }) {
  const hasItems = order.orderItems && order.orderItems.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          {hasItems && (
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {order.orderId}
          </div>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => onCustomerClick(order.name)}
            className={`text-sm text-left transition-colors ${
              isCustomerSelected 
                ? 'text-blue-700 font-semibold' 
                : 'text-gray-900 hover:text-blue-600 hover:underline'
            }`}
          >
            {order.name}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-600">
            **{order.endPhone}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="text-sm font-semibold text-gray-900">
            ${order.totalOrderAmount}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge status={order.paidStatus} type="payment" />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge status={order.packingStatus} type="packing" />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge status={order.shippingStatus} type="shipping" />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <button
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            onClick={() => console.log("TODO: send email", order.orderId)}
          >
            📧 Send Email
          </button>
        </td>
      </tr>
      
      {/* Expanded Order Items Row */}
      {isExpanded && hasItems && (
        <tr className="bg-gray-50">
          <td colSpan="9" className="px-4 py-4">
            <div className="ml-8">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                📦 Order Items ({order.orderItems.length})
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Brand
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                        Spec
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.orderItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.brand}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {item.specification}
                        </td>
                        <td className="px-4 py-2 text-sm text-center text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                          ${item.totalProductAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
