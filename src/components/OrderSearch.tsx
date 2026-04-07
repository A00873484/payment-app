// src/components/OrderSearch.tsx
import { useState, useEffect } from "react";
import type { OrderSearchResponse, OrderSearchResult } from '@/lib/types/api';
import { ErrorResponse } from "@/lib/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusType = 'payment' | 'packing' | 'shipping';
type SearchField = 'name' | 'phone' | 'orderId';

interface SearchFilter {
  field: SearchField;
  value: string;
  label: string;
}

interface SearchFieldOption {
  value: SearchField;
  label: string;
  icon: string;
  placeholder: string;
  adminOnly: boolean;
}

const SEARCH_FIELD_OPTIONS: SearchFieldOption[] = [
  { value: 'name',    label: 'Name',     icon: '👤', placeholder: 'Search by customer name…',  adminOnly: false },
  { value: 'phone',   label: 'Phone',    icon: '📱', placeholder: 'Search by phone number…',   adminOnly: true  },
  { value: 'orderId', label: 'Order ID', icon: '🧾', placeholder: 'Search by order ID…',       adminOnly: true  },
];

interface OrderSearchProps {
  isAdminMode?: boolean;
  placeholder?: string;
  features?: {
    phoneSearch?: boolean;
    emailActions?: boolean;
    generatePaymentLink?: boolean;
    exportData?: boolean;
  };
  className?: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function isCancelled(s: string): boolean {
  return s === 'cancelled' || s === '弃单' || s === 'Canceled' || s === 'Cancelled';
}

function isPaidStatus(s: string): boolean {
  return !!s && s !== 'pending' && s !== '未付款' && s !== 'unpaid' && s !== 'Unpaid' && !isCancelled(s);
}

function isUnpackedStatus(s: string): boolean {
  return !s || s === 'pending' || s === '未裝箱' || s === 'Not Packed';
}

function isPackedStatus(s: string): boolean {
  return s === 'incomplete' || s === 'ready-ship' || (!!s && s.startsWith('pickup-'));
}

function isCompleteShipping(s: string): boolean {
  return s === 'complete' || s === '已發貨' || s === 'Shipped' || s === 'Completed';
}

function formatStatusDisplay(status: string, type: StatusType): string {
  if (isCancelled(status)) return 'Cancelled';

  if (type === 'payment') {
    if (!status || status === 'pending' || status === '未付款' || status === 'unpaid') return 'Unpaid';
    if (status === '已付款') return 'Paid';
    if (status === 'etransfer') return 'E-Transfer';
    if (status === 'cash') return 'Cash';
    const [method, currency] = status.split('-');
    if (method && currency) {
      const m = method === 'etransfer' ? 'E-Transfer' : method.charAt(0).toUpperCase() + method.slice(1);
      return `${m} (${currency})`;
    }
    return status;
  }
  if (type === 'packing') {
    if (!status || status === 'pending' || status === '未裝箱' || status === 'Not Packed') return 'Not Packed';
    if (status === 'incomplete') return 'Incomplete';
    if (status === 'ready-ship') return 'Ready to Ship';
    if (status.startsWith('pickup-')) {
      const loc = status.replace('pickup-', '');
      return `Pickup: ${loc.charAt(0).toUpperCase() + loc.slice(1)}`;
    }
    return status;
  }
  if (type === 'shipping') {
    if (!status || status === 'pending' || status === '未發貨' || status === 'Not Shipped') return 'Pending';
    if (isCompleteShipping(status)) return 'Complete';
    return status;
  }
  return status;
}

function getStatusColor(status: string, type: StatusType): string {
  if (isCancelled(status)) return 'bg-gray-200 text-gray-500 line-through';

  if (type === 'payment') {
    return isPaidStatus(status)
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }
  if (type === 'packing') {
    if (!status || status === 'pending' || status === '未裝箱' || status === 'Not Packed') return 'bg-yellow-100 text-yellow-800';
    if (status === 'incomplete') return 'bg-orange-100 text-orange-800';
    if (status === 'ready-ship') return 'bg-blue-100 text-blue-800';
    if (status.startsWith('pickup-')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
  }
  if (type === 'shipping') {
    return isCompleteShipping(status)
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  }
  return 'bg-gray-100 text-gray-800';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, type, onClick }: {
  status: string;
  type: StatusType;
  onClick?: () => void;
}) {
  const color = getStatusColor(status, type);
  const text  = formatStatusDisplay(status, type);

  if (onClick) {
    return (
      <button
        onClick={onClick}
        title="Click to edit"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} hover:opacity-75 transition-opacity cursor-pointer`}
      >
        {text}
        <svg className="w-2.5 h-2.5 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {text}
    </span>
  );
}

// ─── StatusEditorModal ────────────────────────────────────────────────────────

function StatusEditorModal({
  order,
  field,
  saving,
  onClose,
  onSave,
  onCancelOrder,
}: {
  order: OrderSearchResult;
  field: StatusType;
  saving: boolean;
  onClose: () => void;
  onSave: (dbField: string, value: string) => void;
  onCancelOrder: () => void;
}) {
  const isOrderCancelled = isCancelled(order.paidStatus) || isCancelled(order.packingStatus) || isCancelled(order.shippingStatus);
  const hasAddress = !!order.address && order.address.trim() !== '' && order.address.trim() !== '123';

  // ── Payment state ──
  const [isPaid, setIsPaid] = useState<boolean>(() => isPaidStatus(order.paidStatus));
  const [payMethod, setPayMethod] = useState<'etransfer' | 'cash'>(() => {
    const s = order.paidStatus;
    if (!s) return 'etransfer';
    if (s.startsWith('cash') || s === 'cash') return 'cash';
    return 'etransfer';
  });
  const [currency, setCurrency] = useState<'CAD' | 'RMB'>(() => {
    const parts = (order.paidStatus || '').split('-');
    if (parts.length === 2 && (['CAD', 'RMB'] as string[]).includes(parts[1])) {
      return parts[1] as 'CAD' | 'RMB';
    }
    return 'CAD';
  });

  // ── Packing state ──
  const [packType, setPackType] = useState<'none' | 'incomplete' | 'ship' | 'pickup'>(() => {
    const s = order.packingStatus;
    if (!s || s === 'pending' || s === '未裝箱' || s === 'Not Packed' || isCancelled(s)) {
      return hasAddress ? 'ship' : 'none';
    }
    if (s === 'incomplete') return 'incomplete';
    if (s === 'ready-ship') return 'ship';
    if (s.startsWith('pickup-')) return 'pickup';
    return 'none';
  });
  const [pickupLoc, setPickupLoc] = useState<'richmond' | 'burnaby' | 'coquitlam' | 'surrey'>(() => {
    const s = order.packingStatus || '';
    if (s.startsWith('pickup-')) {
      const loc = s.replace('pickup-', '');
      if (['richmond', 'burnaby', 'coquitlam', 'surrey'].includes(loc)) {
        return loc as 'richmond' | 'burnaby' | 'coquitlam' | 'surrey';
      }
    }
    return 'richmond';
  });

  // ── Shipping state ──
  const [isComplete, setIsComplete] = useState<boolean>(() => isCompleteShipping(order.shippingStatus));

  const handleSave = () => {
    if (field === 'payment') {
      const value = isPaid ? `${payMethod}-${currency}` : 'unpaid';
      onSave('paidStatus', value);
    } else if (field === 'packing') {
      let value = 'pending';
      if (packType === 'incomplete') value = 'incomplete';
      else if (packType === 'ship') value = 'ready-ship';
      else if (packType === 'pickup') value = `pickup-${pickupLoc}`;
      onSave('packingStatus', value);
    } else if (field === 'shipping') {
      onSave('shippingStatus', isComplete ? 'complete' : 'pending');
    }
  };

  const fieldTitle =
    field === 'payment' ? '💳 Payment Status' :
    field === 'packing' ? '📦 Packing Status' :
                          '🚚 Shipping Status';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900">{fieldTitle}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 font-mono">{order.orderId} · {order.name}</p>

        {/* Cancelled banner */}
        {isOrderCancelled && (
          <div className="mb-4 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 font-medium">
            This order is cancelled. You can still edit statuses to reactivate it.
          </div>
        )}

        {/* ── Payment editor ── */}
        {field === 'payment' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-2">
                {([false, true] as const).map(paid => (
                  <button
                    key={String(paid)}
                    onClick={() => setIsPaid(paid)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isPaid === paid
                        ? paid ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {paid ? 'Paid' : 'Not Paid'}
                  </button>
                ))}
              </div>
            </div>

            {isPaid && (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Method</p>
                  <div className="flex gap-2">
                    {(['etransfer', 'cash'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setPayMethod(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          payMethod === m
                            ? 'bg-blue-100 border-blue-400 text-blue-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {m === 'etransfer' ? 'E-Transfer' : 'Cash'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Currency</p>
                  <div className="flex gap-2">
                    {(['CAD', 'RMB'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          currency === c
                            ? 'bg-blue-100 border-blue-400 text-blue-800'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Packing editor ── */}
        {field === 'packing' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Packing Status</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPackType('none')}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    packType === 'none'
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Not Packed
                </button>
                <button
                  onClick={() => setPackType('incomplete')}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    packType === 'incomplete'
                      ? 'bg-orange-100 border-orange-400 text-orange-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Incomplete
                </button>
                <button
                  onClick={() => setPackType('ship')}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    packType === 'ship'
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Ship
                </button>
                <button
                  onClick={() => setPackType('pickup')}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    packType === 'pickup'
                      ? 'bg-purple-100 border-purple-400 text-purple-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Pickup
                </button>
              </div>
            </div>

            {packType === 'incomplete' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                Packed but waiting to be combined with another order before shipping.
              </div>
            )}

            {packType === 'ship' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Ready to Ship — shipping will be marked <strong>complete</strong> automatically.
              </div>
            )}

            {packType === 'pickup' && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Pickup Location</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['richmond', 'burnaby', 'coquitlam', 'surrey'] as const).map(loc => (
                    <button
                      key={loc}
                      onClick={() => setPickupLoc(loc)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border capitalize transition-colors ${
                        pickupLoc === loc
                          ? 'bg-purple-100 border-purple-400 text-purple-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {packType === 'none' && hasAddress && (
              <p className="text-xs text-gray-500 italic">Address on file — consider setting to Ship.</p>
            )}
          </div>
        )}

        {/* ── Shipping editor ── */}
        {field === 'shipping' && (
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsComplete(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !isComplete
                    ? 'bg-gray-100 border-gray-400 text-gray-800'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setIsComplete(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isComplete
                    ? 'bg-green-100 border-green-400 text-green-800'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Complete
              </button>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Cancel order */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={onCancelOrder}
            disabled={saving}
            className="w-full py-2 px-4 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {isOrderCancelled ? 'Already Cancelled' : 'Cancel Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderSearch({
  isAdminMode = false,
  placeholder,
  features = {},
  className = "",
}: OrderSearchProps) {
  const [query, setQuery]                       = useState<string>("");
  const [debouncedQuery, setDebouncedQuery]     = useState<string>("");
  const [searchField, setSearchField]           = useState<SearchField>(isAdminMode ? 'phone' : 'name');
  const [activeFilter, setActiveFilter]         = useState<SearchFilter | null>(null);

  const [results, setResults]                   = useState<OrderSearchResult[]>([]);
  const [allResults, setAllResults]             = useState<OrderSearchResult[]>([]);
  const [loading, setLoading]                   = useState<boolean>(false);
  const [error, setError]                       = useState<string>("");
  const [success, setSuccess]                   = useState<string>("");

  const [expandedOrders, setExpandedOrders]     = useState<Set<string>>(new Set());
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [shippingFilter, setShippingFilter]     = useState<'unshipped' | 'shipped' | null>(null);
  const [selectedOrders, setSelectedOrders]     = useState<Set<string>>(new Set());
  const [packingFilter, setPackingFilter]       = useState<'unpacked' | 'ready' | null>(null);
  const [paymentFilter, setPaymentFilter]       = useState<'unpaid' | 'paid' | null>(null);

  // Status editor
  const [statusEditor, setStatusEditor] = useState<{
    order: OrderSearchResult;
    field: StatusType;
  } | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Feature flags
  const enablePhoneSearch   = isAdminMode && (features.phoneSearch   !== false);
  const enableEmailActions  = isAdminMode && (features.emailActions  !== false);
  const enablePaymentLinks  = isAdminMode && (features.generatePaymentLink !== false);
  const enableExport        = isAdminMode && (features.exportData    !== false);

  const availableFields = SEARCH_FIELD_OPTIONS.filter(
    (opt) => !opt.adminOnly || isAdminMode
  );

  const currentFieldOption = SEARCH_FIELD_OPTIONS.find((o) => o.value === searchField)!;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      clearAll();
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        let url: string;

        if (isAdminMode) {
          const param = searchField === 'name'    ? `query=${encodeURIComponent(debouncedQuery)}`
                      : searchField === 'phone'   ? `phone=${encodeURIComponent(debouncedQuery)}`
                      :                             `orderId=${encodeURIComponent(debouncedQuery)}`;
          url = `/api/orders/search?${param}`;
        } else {
          url = `/api/public/orders/search?query=${encodeURIComponent(debouncedQuery)}`;
        }

        const res = await fetch(url);

        if (!res.ok) {
          const data: ErrorResponse = await res.json();
          throw new Error(data.error || "Search failed");
        }

        const data: OrderSearchResponse = await res.json();

        setActiveFilter({
          field: searchField,
          value: debouncedQuery,
          label: `${currentFieldOption.icon} ${currentFieldOption.label}: ${debouncedQuery}`,
        });

        setAllResults(data.results);
        setResults(data.results);
        setExpandedOrders(new Set(data.results.map((o: OrderSearchResult) => o.orderId)));
        clearCustomerFilter();
        setShippingFilter(null);
        setSelectedOrders(new Set());
      } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setResults([]);
        setAllResults([]);
        setActiveFilter(null);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, searchField, isAdminMode]);

  useEffect(() => {
    let filtered = allResults;

    if (selectedCustomerName) {
      filtered = filtered.filter(
        (o) => o.name === selectedCustomerName && o.phone === selectedCustomerPhone
      );
    }

    if (shippingFilter === 'unshipped') {
      filtered = filtered.filter((o) => !isCompleteShipping(o.shippingStatus) && !isCancelled(o.shippingStatus));
    } else if (shippingFilter === 'shipped') {
      filtered = filtered.filter((o) => isCompleteShipping(o.shippingStatus));
    }

    if (packingFilter === 'unpacked') {
      filtered = filtered.filter((o) => isUnpackedStatus(o.packingStatus));
    } else if (packingFilter === 'ready') {
      filtered = filtered.filter((o) => !isUnpackedStatus(o.packingStatus));
    }

    if (paymentFilter === 'unpaid') {
      filtered = filtered.filter((o) => !isPaidStatus(o.paidStatus) && !isCancelled(o.paidStatus));
    } else if (paymentFilter === 'paid') {
      filtered = filtered.filter((o) => isPaidStatus(o.paidStatus));
    }

    setResults(filtered);
  }, [selectedCustomerName, selectedCustomerPhone, shippingFilter, packingFilter, paymentFilter, allResults]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function clearAll() {
    setResults([]);
    setAllResults([]);
    setExpandedOrders(new Set());
    setActiveFilter(null);
    clearCustomerFilter();
    setShippingFilter(null);
    setSelectedOrders(new Set());
    setPackingFilter(null);
    setPaymentFilter(null);
  }

  const allExpanded = results.length > 0 && results.every(o => expandedOrders.has(o.orderId));
  const toggleExpandAll = () => {
    if (allExpanded) setExpandedOrders(new Set());
    else setExpandedOrders(new Set(results.map(o => o.orderId)));
  };

  const cyclePackingFilter = () => setPackingFilter(f => f === null ? 'unpacked' : f === 'unpacked' ? 'ready' : null);

  const cyclePaymentFilter = () =>
    setPaymentFilter(f => f === null ? 'unpaid' : f === 'unpaid' ? 'paid' : 'unpaid');

  function dismissFilter() {
    setQuery("");
    setDebouncedQuery("");
    clearAll();
  }

  function clearCustomerFilter() {
    setSelectedCustomerName(null);
    setSelectedCustomerPhone(null);
  }

  function handleCustomerClick(order: OrderSearchResult | null) {
    if (!order) { clearCustomerFilter(); return; }
    setSelectedCustomerName(order.name);
    setSelectedCustomerPhone(order.phone);
  }

  function handleFieldSelect(field: SearchField) {
    setSearchField(field);
    setQuery("");
    clearAll();
  }

  const toggleOrder = (id: string) =>
    setExpandedOrders((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleOrderSelection = (id: string) =>
    setSelectedOrders((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const selectAllOrders = () => setSelectedOrders(new Set(results.map((o) => o.orderId)));
  const clearSelection  = () => setSelectedOrders(new Set());

  const getPlaceholderText = () => placeholder ?? currentFieldOption.placeholder;

  // ── Status editing ────────────────────────────────────────────────────────────

  async function postStatusUpdate(dbOrderId: string, payload: { field?: string; value?: string; updates?: Record<string, string> }) {
    const res = await fetch('/api/admin/update-order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: dbOrderId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data.updates as Record<string, string>;
  }

  async function handleStatusSave(dbField: string, value: string) {
    if (!statusEditor) return;
    setSavingStatus(true);
    setError("");
    try {
      const updates = await postStatusUpdate(statusEditor.order.dbOrderId, { field: dbField, value });
      applyLocalUpdates(statusEditor.order.dbOrderId, updates);
      setStatusEditor(null);
      flashSuccess('Status updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleCancelOrder() {
    if (!statusEditor) return;
    setSavingStatus(true);
    setError("");
    try {
      const updates = await postStatusUpdate(statusEditor.order.dbOrderId, {
        updates: { paidStatus: 'cancelled', packingStatus: 'cancelled', shippingStatus: 'cancelled' },
      });
      applyLocalUpdates(statusEditor.order.dbOrderId, updates);
      setStatusEditor(null);
      flashSuccess('Order cancelled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setSavingStatus(false);
    }
  }

  function applyLocalUpdates(dbOrderId: string, updates: Record<string, string>) {
    setAllResults(prev => prev.map(o =>
      o.dbOrderId === dbOrderId ? { ...o, ...updates } : o
    ));
  }

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  // ── Admin bulk actions ─────────────────────────────────────────────────────────

  const sendBulkPaymentEmail = async () => {
    if (!selectedOrders.size) return;
    try {
      setError(""); setSuccess("");
      const res = await fetch('/api/admin/send-bulk-payment-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to send emails'); }
      const d = await res.json();
      setSuccess(`Sent ${d.sent} email(s) for ${selectedOrders.size} order(s)`);
      clearSelection();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to send emails'); }
  };

  const generateBulkPaymentLinks = async () => {
    if (!selectedOrders.size) return;
    try {
      setError(""); setSuccess("");
      const res = await fetch('/api/admin/generate-bulk-payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to generate links'); }
      const d = await res.json();
      const text = d.links.map((l: { customer: string; email: string; portalUrl: string }) =>
        `${l.customer} (${l.email}): ${l.portalUrl}`
      ).join('\n\n');
      await navigator.clipboard.writeText(text);
      setSuccess(`Generated ${d.links.length} payment link(s) — copied to clipboard!`);
      clearSelection();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate links'); }
  };

  const exportSelectedOrders = () => {
    if (!selectedOrders.size) return;
    const selected = results.filter((o) => selectedOrders.has(o.orderId));
    const headers  = ['Order ID', 'Customer', 'Phone', 'Total', 'Payment', 'Packing', 'Shipping'];
    const rows     = selected.map((o) => [o.orderId, o.name, o.phone, o.totalOrderAmount, o.paidStatus, o.packingStatus, o.shippingStatus]);
    const csv      = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob     = new Blob([csv], { type: 'text/csv' });
    const url      = URL.createObjectURL(blob);
    const a        = Object.assign(document.createElement('a'), { href: url, download: 'orders.csv' });
    a.click();
    URL.revokeObjectURL(url);
    setSuccess(`Exported ${selectedOrders.size} order(s)`);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto">

        {/* ── Search Header ── */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-4">
          {!isAdminMode && (
            <h1 className="text-2xl font-bold text-gray-900 mb-4">🔎 Search Orders</h1>
          )}

          {/* Search field toggle (admin only) */}
          {isAdminMode && availableFields.length > 1 && (
            <div className="flex gap-1.5 mb-3">
              {availableFields.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldSelect(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    searchField === opt.value
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder={getPlaceholderText()}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-lg text-base shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {activeFilter && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active filter:</span>
              <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {activeFilter.label}
                <button onClick={dismissFilter} aria-label="Clear filter" className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>

              {selectedCustomerName && (
                <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  👤 Customer: {selectedCustomerName}
                  <button onClick={clearCustomerFilter} aria-label="Clear customer filter" className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {shippingFilter && (
                <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  🚚 {shippingFilter === 'unshipped' ? 'Unshipped' : 'Shipped'}
                  <button onClick={() => setShippingFilter(null)} aria-label="Clear shipping filter" className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {packingFilter && (
                <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  📦 {packingFilter === 'unpacked' ? 'Not Packed' : 'Packed'}
                  <button onClick={() => setPackingFilter(null)} aria-label="Clear packing filter" className="ml-0.5 rounded-full p-0.5 hover:bg-yellow-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {paymentFilter && (
                <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  💳 {paymentFilter === 'unpaid' ? 'Unpaid' : 'Paid'}
                  <button onClick={() => setPaymentFilter(null)} aria-label="Clear payment filter" className="ml-0.5 rounded-full p-0.5 hover:bg-green-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Admin bulk actions bar ── */}
        {isAdminMode && selectedOrders.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-900">{selectedOrders.size} order(s) selected</span>
                <button onClick={clearSelection} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {enableEmailActions && (
                  <button onClick={sendBulkPaymentEmail} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors">
                    📧 Send Payment Emails
                  </button>
                )}
                {enablePaymentLinks && (
                  <button onClick={generateBulkPaymentLinks} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors">
                    🔗 Generate Payment Links
                  </button>
                )}
                {enableExport && (
                  <button onClick={exportSelectedOrders} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg font-medium transition-colors">
                    📥 Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center text-blue-600 font-medium">Searching…</div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-4">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {!loading && debouncedQuery && results.length === 0 && !error && (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center text-gray-500">
            No orders found for that {currentFieldOption.label.toLowerCase()}.
          </div>
        )}

        {/* ── Results table ── */}
        {allResults.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div className="flex gap-3">
                {isAdminMode && (
                  <>
                    <button onClick={selectAllOrders} className="text-xs text-blue-600 hover:text-blue-800 underline">
                      Select All ({results.length})
                    </button>
                    {selectedOrders.size > 0 && (
                      <button onClick={clearSelection} className="text-xs text-gray-600 hover:text-gray-800 underline">
                        Clear Selection
                      </button>
                    )}
                  </>
                )}
                <button onClick={toggleExpandAll} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
              <span className="text-xs text-gray-500">Showing {results.length} of {allResults.length} orders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {isAdminMode && (
                      <th className="px-4 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === results.length && results.length > 0}
                          onChange={(e) => e.target.checked ? selectAllOrders() : clearSelection()}
                          className="rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 w-10" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {enablePhoneSearch ? 'Phone' : 'Contact'}
                    </th>
                    <th
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        selectedCustomerName ? 'text-purple-700' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={clearCustomerFilter}
                      title={selectedCustomerName ? "Click to clear customer filter" : "Click a customer name to filter"}
                    >
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        paymentFilter === 'unpaid' ? 'text-red-600' : paymentFilter === 'paid' ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={cyclePaymentFilter}
                      title={paymentFilter ? `Showing ${paymentFilter} — click to toggle` : 'Click to filter by payment status'}
                    >
                      Payment {paymentFilter === 'unpaid' ? '↑' : paymentFilter === 'paid' ? '↑' : ''}
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        packingFilter === 'unpacked' ? 'text-yellow-700' : packingFilter === 'ready' ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={cyclePackingFilter}
                      title={packingFilter === 'unpacked' ? 'Showing not packed — click for packed' : packingFilter === 'ready' ? 'Showing packed — click to clear' : 'Click to filter by packing status'}
                    >
                      Packed {packingFilter ? '↑' : ''}
                    </th>
                    <th
                      className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                        shippingFilter === 'unshipped' ? 'text-amber-700' : shippingFilter === 'shipped' ? 'text-green-700' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setShippingFilter(f => f === null ? 'unshipped' : f === 'unshipped' ? 'shipped' : null)}
                      title={shippingFilter === 'unshipped' ? 'Showing unshipped — click for shipped' : shippingFilter === 'shipped' ? 'Showing shipped — click to clear' : 'Click to filter by shipping status'}
                    >
                      Shipping {shippingFilter ? '↑' : ''}
                    </th>
                    {isAdminMode && enableEmailActions && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((order, i) => (
                    <OrderRow
                      key={i}
                      order={order}
                      isExpanded={expandedOrders.has(order.orderId)}
                      isSelected={selectedOrders.has(order.orderId)}
                      onToggle={() => toggleOrder(order.orderId)}
                      onSelect={() => toggleOrderSelection(order.orderId)}
                      onCustomerClick={() => handleCustomerClick(order)}
                      isCustomerSelected={selectedCustomerName === order.name && selectedCustomerPhone === order.phone}
                      isAdminMode={isAdminMode}
                      showPhone={enablePhoneSearch}
                      showActions={enableEmailActions}
                      onStatusClick={(field) => setStatusEditor({ order, field })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Status editor modal ── */}
      {statusEditor && (
        <StatusEditorModal
          order={statusEditor.order}
          field={statusEditor.field}
          saving={savingStatus}
          onClose={() => !savingStatus && setStatusEditor(null)}
          onSave={handleStatusSave}
          onCancelOrder={handleCancelOrder}
        />
      )}
    </div>
  );
}

// ─── OrderRow ────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: OrderSearchResult;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onCustomerClick: () => void;
  isCustomerSelected: boolean;
  isAdminMode: boolean;
  showPhone: boolean;
  showActions: boolean;
  onStatusClick: (field: StatusType) => void;
}

function OrderRow({
  order, isExpanded, isSelected,
  onToggle, onSelect, onCustomerClick,
  isCustomerSelected, isAdminMode, showPhone, showActions,
  onStatusClick,
}: OrderRowProps) {
  const hasItems  = order.orderItems?.length > 0;
  const firstBrand = order.orderItems?.find(item => item.brand)?.brand ?? '—';
  // expand | orderId | brand | customer | phone | total | payment | packed | shipping | [actions]
  const colSpan   = 9 + (isAdminMode ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        {isAdminMode && (
          <td className="px-4 py-3 text-center">
            <input type="checkbox" checked={isSelected} onChange={onSelect} className="rounded border-gray-300" />
          </td>
        )}
        <td className="px-4 py-3">
          {hasItems && (
            <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={isExpanded ? "Collapse" : "Expand"}>
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-gray-600 font-mono">
            {showPhone ? order.phone : `··${order.endPhone}`}
          </span>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onCustomerClick}
            className={`text-sm text-left transition-colors ${
              isCustomerSelected
                ? 'text-purple-700 font-semibold underline'
                : 'text-gray-900 hover:text-purple-600 hover:underline'
            }`}
            title="Click to filter by this customer"
          >
            {order.name}
          </button>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm text-gray-500">{firstBrand}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-sm font-medium text-gray-900">{order.orderId}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <span className="text-sm font-semibold text-gray-900">${order.totalOrderAmount}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge
            status={order.paidStatus}
            type="payment"
            onClick={isAdminMode ? () => onStatusClick('payment') : undefined}
          />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge
            status={order.packingStatus}
            type="packing"
            onClick={isAdminMode ? () => onStatusClick('packing') : undefined}
          />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <StatusBadge
            status={order.shippingStatus}
            type="shipping"
            onClick={isAdminMode ? () => onStatusClick('shipping') : undefined}
          />
        </td>
        {isAdminMode && showActions && (
          <td className="px-4 py-3 whitespace-nowrap text-center">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              📧 Email
            </button>
          </td>
        )}
      </tr>

      {/* Expanded items */}
      {isExpanded && hasItems && (
        <tr className="bg-gray-50">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="ml-8">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Brand', 'Product', 'Spec', 'Qty', 'Price'].map((h) => (
                        <th key={h} className={`px-4 py-2 text-xs font-medium text-gray-600 ${h === 'Qty' ? 'text-center' : h === 'Price' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.orderItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{item.brand}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.specification}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">${item.totalProductAmount}</td>
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
