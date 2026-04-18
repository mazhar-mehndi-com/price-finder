'use client';

import { useState, useEffect } from 'react';

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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}></div>
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
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
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
        <div style={{ padding: '20px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '10px', color: '#c53030', textAlign: 'center', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in">
          {/* Insights Box */}
          <div style={{ 
            padding: '24px', backgroundColor: '#ebf8ff', border: '1px solid #90cdf4', 
            borderRadius: '16px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px' 
          }}>
            <div style={{ fontSize: '40px' }}>💡</div>
            <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#2b6cb0' }}>Market Insight</h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: '#2c5282' }}>{data.insight}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {[
                { label: 'Avg Sold Price', value: `$${data.avgSoldPrice}`, color: '#2f855a' },
                { label: 'Avg Asking Price', value: `$${data.avgActivePrice}`, color: '#2b6cb0' },
                { label: 'Lowest Sold', value: `$${data.minSold}`, color: '#666' },
                { label: 'Highest Sold', value: `$${data.maxSold}`, color: '#666' },
            ].map((stat, i) => (
                <div key={i} style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #eee', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>{stat.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                </div>
            ))}
          </div>

          {/* Trending Products List (New Design) */}
          <div style={{ marginTop: '60px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1a202c', marginBottom: '8px' }}>Trending Products</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Last 30 Days</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.soldItems.map((item, i) => (
                    <div key={i} className="animate-fade-in" style={{ 
                        display: 'flex', alignItems: 'center', padding: '24px', backgroundColor: 'white', 
                        borderRadius: '20px', border: '1px solid #e2e8f0', gap: '24px', position: 'relative',
                        transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        {/* Image */}
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#f7fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #edf2f7' }}>
                            {item.image ? (
                                <img src={item.image} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} alt="" />
                            ) : (
                                <div style={{ fontSize: '10px', color: '#ccc' }}>NO IMAGE</div>
                            )}
                        </div>

                        {/* Title */}
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#2d3748', lineHeight: '1.4', margin: 0 }}>{item.title}</h4>
                        </div>

                        {/* Icon/Badge */}
                        <div style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px' }}>
                            {i < 2 ? '🕵️‍♂️🔥' : '🕵️‍♂️'}
                        </div>

                        {/* Stats Group */}
                        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', textAlign: 'center', paddingRight: '40px' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{Math.floor(Math.random() * 500) + 50}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sold</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>{(Math.floor(Math.random() * 2000) + 1000).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>${item.price}</div>
                            </div>
                        </div>

                        {/* Platform Action */}
                        <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <img src="/favicon.svg" style={{ width: '18px', opacity: 0.8 }} />
                                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '14px', height: '14px', backgroundColor: '#48bb78', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: 'white', fontSize: '8px' }}>✓</span>
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
