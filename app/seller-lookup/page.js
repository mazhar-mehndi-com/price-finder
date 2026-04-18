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
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', padding: '40px 20px' }}>
      <section style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', color: COLORS.textMain, marginBottom: '10px' }}>Seller Lookup</h1>
        <p style={{ color: COLORS.textMuted, fontSize: '16px', marginBottom: '40px' }}>Analyze specific eBay seller performance and winning items.</p>

        <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '26px', border: `1px solid ${COLORS.border}`, display: 'flex', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', marginBottom: '60px' }}>
            <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter eBay Username (e.g. bhfo)..."
                style={{ flex: 1, border: 'none', padding: '18px 30px', outline: 'none', fontSize: '16px', fontWeight: '500', color: COLORS.textMain }}
            />
            <button onClick={handleSearch} disabled={loading} style={{ backgroundColor: COLORS.textMain, color: '#fff', border: 'none', padding: '0 35px', borderRadius: '20px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                {loading ? 'Analyzing...' : 'Search Seller'}
            </button>
        </div>

        {error && (
            <div style={{ padding: '20px', backgroundColor: '#fff1f2', borderRadius: '20px', color: COLORS.danger, fontWeight: '700', marginBottom: '30px', border: `1px solid ${COLORS.danger}20` }}>
                ⚠️ {error}
            </div>
        )}

        {data && (
            <div className="animate-fade-in" style={{ textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    {[
                        { l: 'Seller', v: data.username },
                        { l: 'STR', v: data.stats.marketStr },
                        { l: 'Total Sold', v: data.stats.totalSold },
                        { l: 'Unique Items', v: data.stats.uniqueProducts }
                    ].map(s => (
                        <div key={s.l} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '5px' }}>{s.l}</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.textMain }}>{s.v}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {data.products.map((item, i) => (
                        <div key={i} style={{ backgroundColor: 'white', borderRadius: '22px', border: '1.5px solid #eff6ff', padding: '25px', display: 'grid', gridTemplateColumns: '80px 1fr 150px 80px', alignItems: 'center', gap: '20px', cursor: 'pointer' }} onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.itemUrl)}`, '_blank')}>
                            <img src={item.imageUrl} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textMain, marginBottom: '5px' }}>{item.title}</h4>
                                <div style={{ fontSize: '11px', color: COLORS.primary, fontWeight: '700' }}>{item.trend}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', color: COLORS.textMuted }}>SOLD VOLUME</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textMain }}>{item.soldCount}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.success }}>${item.avgSoldPrice}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </section>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
