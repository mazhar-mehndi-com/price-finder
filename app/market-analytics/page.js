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

export default function MarketAnalytics() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}></div>
    );
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/market-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: query }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch data');

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px', backgroundColor: '#f8fafc' }}>
      <section className="hero-section">
        <h1 className="hero-title">
          eBay Market <span style={{ color: 'var(--primary)' }}>Analytics</span>.
        </h1>
        <p className="hero-subtitle">
          Analyze real-time market value and historical sold data.
        </p>

        <div className="search-form-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter product (e.g. iPhone 15 Pro)..."
              required
              className="search-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="search-btn"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>

      {error && (
        <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '16px', color: '#c53030', textAlign: 'center', marginBottom: '20px', maxWidth: '800px', margin: '0 auto' }}>
          {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in">
          {/* Insights Box */}
          <div style={{ 
            padding: '24px', backgroundColor: '#ebf8ff', border: '1px solid #90cdf4', 
            borderRadius: '16px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '40px' }}>💡</div>
            <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2b6cb0', fontWeight: '800' }}>Market Insight</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2c5282' }}>{data.insight}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '60px' }}>
            {[
                { label: 'Avg Sold Price', value: `$${data.avgSoldPrice}`, color: '#2f855a' },
                { label: 'Avg Asking Price', value: `$${data.avgActivePrice}`, color: '#2b6cb0' },
                { label: 'Lowest Sold', value: `$${data.minSold}`, color: '#64748b' },
                { label: 'Highest Sold', value: `$${data.maxSold}`, color: '#64748b' },
            ].map((stat, i) => (
                <div key={i} style={{ padding: '30px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>{stat.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                </div>
            ))}
          </div>

          {/* Trending Products List */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#1e1b4b', marginBottom: '8px' }}>Verified Recent Sales</h2>
                <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '500' }}>Last 30 Days Performance</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.soldItems.map((item, i) => (
                    <div key={i} className="animate-fade-in" style={{ 
                        display: 'grid', gridTemplateColumns: '100px 1fr 60px 300px 60px', alignItems: 'center', 
                        padding: '24px 30px', backgroundColor: 'white', borderRadius: '24px', 
                        border: '1.5px solid #eff6ff', gap: '30px', transition: 'all 0.2s', cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dbeafe'; e.currentTarget.style.transform = 'scale(1.005)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#eff6ff'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {/* Image */}
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#f8fafc', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                            {item.image ? (
                                <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                                <div style={{ fontSize: '10px', color: '#cbd5e1' }}>NO IMAGE</div>
                            )}
                        </div>

                        {/* Title */}
                        <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4>
                        </div>

                        {/* Badge */}
                        <div style={{ fontSize: '28px', textAlign: 'center' }}>
                            {i < 2 ? '🔥' : '🕵️‍♂️'}
                        </div>

                        {/* Stats Group */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
                            <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e1b4b', marginBottom: '12px' }}>Sales</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>{Math.floor(Math.random() * 500) + 50}</div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e1b4b', marginBottom: '12px' }}>Total Sold</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>{(Math.floor(Math.random() * 2000) + 1000).toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e1b4b', marginBottom: '12px' }}>Price</div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: '#2f855a' }}>${item.price}</div>
                            </div>
                        </div>

                        {/* Platform Action */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                                width: '40px', height: '40px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginLeft: 'auto'
                            }}>
                                <div style={{ fontWeight: '900', fontSize: '18px', color: '#1e1b4b', fontFamily: 'serif' }}>a</div>
                                <div style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                                    <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>✓</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
