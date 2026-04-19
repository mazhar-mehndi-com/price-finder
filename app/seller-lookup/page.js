'use client';

import { useState, useEffect } from 'react';

const COLORS = {
  bg: '#f4f6fb',
  card: '#ffffff',
  primary: '#6366f1',
  primaryLight: '#eef2ff',
  textMain: '#1e1b4b',
  textMuted: '#94a3b8',
  border: '#eef2ff',
  success: '#10b981',
  danger: '#ef4444'
};

export default function SellerLookup() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg }}></div>;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!username) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', padding: '60px 20px' }}>
      <section style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '900', color: COLORS.textMain, letterSpacing: '-0.03em', marginBottom: '10px' }}>Seller Lookup</h1>
        <p style={{ color: COLORS.textMuted, fontSize: '16px', marginBottom: '40px', fontWeight: '500' }}>Deep performance analysis for specific eBay competitors.</p>

        <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '26px', border: `1px solid ${COLORS.border}`, display: 'flex', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', marginBottom: '60px' }}>
            <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter eBay username (e.g. bhfo)..."
                style={{ flex: 1, border: 'none', padding: '18px 30px', outline: 'none', fontSize: '16px', fontWeight: '500', color: COLORS.textMain, minWidth: 0 }}
            />
            <button onClick={handleSearch} disabled={loading} style={{ backgroundColor: COLORS.textMain, color: '#fff', border: 'none', padding: '0 35px', borderRadius: '20px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                {loading ? 'Analyzing...' : 'Analyze Seller'}
            </button>
        </div>

        {error && (
            <div style={{ padding: '20px', backgroundColor: '#fff1f2', borderRadius: '20px', color: COLORS.danger, fontWeight: '700', marginBottom: '30px', border: `1px solid ${COLORS.danger}20` }}>
                ⚠️ {error}
            </div>
        )}

        {data && (
            <div className="animate-fade-in" style={{ textAlign: 'left' }}>
                {/* Stats Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    {[
                        { l: 'Seller Account', v: data.username, c: COLORS.primary },
                        { l: 'Sell-Through Rate', v: data.stats.marketStr, c: COLORS.success },
                        { l: 'Recent Sales', v: data.stats.totalSold, c: COLORS.textMain },
                        { l: 'Unique Listings', v: data.stats.uniqueProducts, c: COLORS.textMuted }
                    ].map(s => (
                        <div key={s.l} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', border: `1px solid ${COLORS.border}`, textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{s.l}</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: s.c }}>{s.v}</div>
                        </div>
                    ))}
                </div>

                {/* Product List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {data.products.map((item, i) => (
                        <div key={i} style={{ 
                            backgroundColor: 'white', borderRadius: '24px', border: '1.5px solid #eff6ff', 
                            padding: '24px 30px', display: 'grid', gridTemplateColumns: '90px 1fr 120px 100px', 
                            alignItems: 'center', gap: '24px', cursor: 'pointer', transition: 'all 0.2s'
                        }} 
                        className="hover-card"
                        onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.itemUrl)}`, '_blank')}>
                            
                            <div style={{ width: '80px', height: '80px', borderRadius: '14px', backgroundColor: '#f8fafc', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '10px' }}>NO IMAGE</div>
                                )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                                <h4 style={{ fontSize: '15px', fontWeight: '700', color: COLORS.textMain, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>{item.trend}</span>
                                    <span style={{ fontSize: '11px', color: COLORS.textMuted }}>{item.insight}</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>Sold Count</div>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.textMain }}>{item.soldCount}</div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.success }}>${item.avgSoldPrice}</div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textMuted }}>AVG PRICE</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </section>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hover-card:hover { transform: scale(1.01); border-color: #6366f1; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.05); }
      `}</style>
    </div>
  );
}
