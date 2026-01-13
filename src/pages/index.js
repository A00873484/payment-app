import { useState, useEffect } from "react";
import Head from "next/head";

export default function AdminOrderSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounce input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
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
        setResults(data.results);
      } catch (err) {
        console.error("Search error:", err);
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  return (
    <>
      <Head>
        <title>Admin Order Search</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto bg-white shadow-xl p-8 rounded-2xl">

          {/* Header */}
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            🔎 Search Orders
          </h1>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Enter customer email or phone number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-4 border rounded-xl mb-6 text-lg shadow-sm focus:ring focus:ring-blue-200"
          />

          {/* Loading */}
          {loading && (
            <div className="text-blue-600 font-medium text-center py-4">
              Searching…
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* No Results */}
          {!loading && debouncedQuery && results.length === 0 && !error && (
            <p className="text-gray-500 text-center py-4">
              No orders found.
            </p>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((row, index) => (
                <OrderCard key={index} row={row} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// 🧩 Card for displaying each matched order
function OrderCard({ row }) {
  return (
    <div className="bg-gray-50 border p-4 rounded-xl shadow-sm">
      <p className="text-lg font-semibold text-gray-800">
        Order #{row[0]}
      </p>

      <div className="mt-2 text-gray-700 space-y-1">
        <p><strong>Email:</strong> {row[3]}</p>
        <p><strong>Phone:</strong> {row[4]}</p>
        <p><strong>Status:</strong> {row[10]}</p>
      </div>

      <button
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-medium transition"
        onClick={() => console.log("TODO: send email")}
      >
        Send Payment Email
      </button>
    </div>
  );
}
