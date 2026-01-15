import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function SyncDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
    } else if (status === 'authenticated') {
      loadStats();
    }
  }, [status]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sync/status');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerMasterSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      
      const response = await fetch('/api/sync/seed-from-master', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({
          type: 'success',
          text: `✅ Sync completed! Added: ${data.recordsAdded}, Updated: ${data.recordsUpdated}, Failed: ${data.recordsFailed}`
        });
        await loadStats();
      } else {
        setMessage({
          type: 'error',
          text: '❌ Sync failed: ' + data.error
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Sync failed: ' + error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const triggerReconcile = async () => {
    try {
      setSyncing(true);
      setMessage({ type: 'info', text: '🔍 Checking for inconsistencies...' });
      
      const response = await fetch('/api/sync/reconcile', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.totalIssues === 0) {
          setMessage({
            type: 'success',
            text: '✅ No inconsistencies found! Database and Master sheet are in sync.'
          });
        } else {
          setMessage({
            type: 'warning',
            text: `⚠️ Found ${data.totalIssues} inconsistencies. Check console for details.`
          });
          console.log('Reconciliation issues:', data.issues);
        }
      } else {
        setMessage({
          type: 'error',
          text: '❌ Reconciliation failed: ' + data.error
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Reconciliation failed: ' + error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Database Sync Dashboard - Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  🔄 Database Sync Dashboard
                </h1>
                <p className="text-gray-600">
                  Manage Master Sheet ↔ Database synchronization
                </p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
              >
                ← Back to Admin
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading statistics...</p>
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Total Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">
                        {stats.totalOrders || 0}
                      </p>
                    </div>
                    <div className="bg-blue-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Paid Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Paid Orders</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">
                        {stats.paidOrders || 0}
                      </p>
                    </div>
                    <div className="bg-green-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Unpaid Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Unpaid Orders</p>
                      <p className="text-3xl font-bold text-orange-600 mt-1">
                        {stats.unpaidOrders || 0}
                      </p>
                    </div>
                    <div className="bg-orange-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                      <p className="text-3xl font-bold text-purple-600 mt-1">
                        ${(stats.totalRevenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-purple-100 rounded-full p-3">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Sync Operations</h2>
                
                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : message.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                      : message.type === 'info'
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seed from Master */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">🌱 Seed from Master Sheet</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Import all orders, users, and products from Master sheet to database. Creates new records and updates existing ones.
                    </p>
                    <button
                      onClick={triggerMasterSync}
                      disabled={syncing}
                      className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                        syncing
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                      }`}
                    >
                      {syncing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Syncing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Import from Master
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Reconcile */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">🔍 Reconcile Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Check for inconsistencies between database and Master sheet. Reports any mismatches in order statuses.
                    </p>
                    <button
                      onClick={triggerReconcile}
                      disabled={syncing}
                      className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                        syncing
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                      }`}
                    >
                      {syncing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Checking...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          Check Consistency
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Sync Logs */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Sync Logs</h2>
                
                {stats.recentSyncs && stats.recentSyncs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Added</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Updated</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Failed</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentSyncs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                                {log.syncType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                log.status === 'SUCCESS' 
                                  ? 'bg-green-100 text-green-700'
                                  : log.status === 'FAILED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              <span className="text-green-600 font-semibold">+{log.recordsAdded}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              <span className="text-blue-600 font-semibold">~{log.recordsUpdated}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              <span className="text-red-600 font-semibold">✗{log.recordsFailed}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No sync logs yet. Run your first sync above!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
