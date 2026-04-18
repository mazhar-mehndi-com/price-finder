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

          {/* Comparison View */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Sold Listings */}
            <div>
                <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2f855a' }}>Recent Sales (Last 30 Days)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {data.soldItems.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#f0fff4', borderRadius: '12px', border: '1px solid #c6f6d5' }}>
                            <img src={item.image} style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{item.title}</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2f855a' }}>${item.price}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Listings */}
            <div>
                <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2b6cb0' }}>Current Listings</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {data.activeItems.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#ebf8ff', borderRadius: '12px', border: '1px solid #bee3f8' }}>
                            <img src={item.image} style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{item.title}</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2b6cb0' }}>${item.price}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
