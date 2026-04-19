'use client';

import { useState, useEffect } from 'react';

const COLORS = {
  bg: '#f4f6fb',
  card: '#ffffff',
  primary: '#6366f1',
  textMain: '#1e1b4b',
  textMuted: '#94a3b8',
  border: '#eef2ff',
  success: '#10b981'
};

export default function WorkerAdmin() {
  const [status, setStatus] = useState('Idle');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg }}></div>;

  const runSync = async () => {
    setLoading(true);
    setStatus('Running Market Scan...');
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] Starting background sync...`, ...prev]);

    try {
      // Trigger the discovery API
      const res = await fetch('/api/discover-sellers', { method: 'POST' });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Sync failed");

      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ Sync Complete: Found ${json.sellers.length} sellers and ${json.products.length} products.`, ...prev]);
      setStatus('Success - Data Saved to MySQL');
    } catch (err) {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${err.message}`, ...prev]);
      setStatus('Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', padding: '60px 20px' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '900', color: COLORS.textMain, marginBottom: '10px' }}>Worker Control Center</h1>
            <p style={{ color: COLORS.textMuted, fontSize: '16px' }}>Manage the background discovery engine and database sync.</p>
        </header>

        <div style={{ backgroundColor: 'white', borderRadius: '24px', border: `1px solid ${COLORS.border}`, padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>CURRENT STATUS</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: status === 'Failed' ? '#ef4444' : (status === 'Idle' ? COLORS.textMain : COLORS.primary) }}>
                        {status}
                    </div>
                </div>
                <button 
                    onClick={runSync} 
                    disabled={loading}
                    style={{ 
                        backgroundColor: COLORS.textMain, color: 'white', border: 'none', 
                        padding: '15px 35px', borderRadius: '16px', fontWeight: '800', 
                        fontSize: '14px', cursor: 'pointer', opacity: loading ? 0.7 : 1 
                    }}
                >
                    {loading ? 'Processing...' : '🚀 Start Market Sync'}
                </button>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '30px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.textMain, marginBottom: '20px' }}>Activity Logs</h3>
                <div style={{ 
                    backgroundColor: '#0f172a', borderRadius: '16px', padding: '20px', 
                    height: '300px', overflowY: 'auto', fontFamily: 'monospace', 
                    fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' 
                }}>
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '8px', color: log.includes('✅') ? '#10b981' : (log.includes('❌') ? '#ef4444' : '#94a3b8') }}>
                            {log}
                        </div>
                    )) : (
                        <div style={{ color: '#475569', fontStyle: 'italic' }}>System idle. Awaiting command...</div>
                    )}
                </div>
            </div>
        </div>

        <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: COLORS.textMuted }}>
                Note: Manual sync will trigger a fresh scrape of eBay's Best Sellers list and update your online database.
            </p>
        </div>

      </main>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
