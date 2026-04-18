'use client';

import { useState, useEffect } from 'react';

export default function CompetitorResearch() {
  const [username, setUsername] = useState('');
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
      if (!response.ok) throw new Error(result.error || 'Failed to fetch competitor data');

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
          Competitor <span style={{ color: 'var(--primary)' }}>Insights</span>.
        </h1>
        <p className="hero-subtitle">
          "Snipe" any eBay seller's best performing products and sales velocity.
        </p>

        <div className="search-form-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter eBay Seller Username..."
              required
              className="search-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="search-btn"
            >
              {loading ? 'Analyzing Store...' : 'Analyze Seller'}
            </button>
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>

      {error && (
        <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '16px', color: '#c53030', textAlign: 'center', marginBottom: '20px', maxWidth: '800px', margin: '0 auto 40px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in">
          {/* Seller Stats Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {[
                { label: 'Seller Account', value: data.username, color: 'var(--primary)' },
                { label: 'Recent Sold Items', value: data.stats.totalRecentSales, color: 'var(--success)' },
                { label: 'Avg. Sale Price', value: `$${data.stats.averagePrice}`, color: '#2d3748' },
                { label: 'Unique Products', value: data.stats.uniqueProducts, color: '#666' },
            ].map((stat, i) => (
                <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                </div>
            ))}
          </div>

          {/* Money Makers List */}
          <div style={{ marginTop: '60px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1a202c', marginBottom: '8px' }}>Hot Items Found</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Sorted by Sales Velocity (How many times it sold recently)</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.topItems.map((item, i) => (
                    <div key={i} className="animate-fade-in" style={{ 
                        display: 'flex', alignItems: 'center', padding: '24px', backgroundColor: 'white', 
                        borderRadius: '20px', border: '1px solid #e2e8f0', gap: '24px', position: 'relative',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        {/* Image */}
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#f7fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #edf2f7' }}>
                            <img src={item.imageUrl} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
                        </div>

                        {/* Title & Link */}
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#2d3748', lineHeight: '1.4', marginBottom: '8px' }}>{item.title}</h4>
                            <a href={item.itemUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>View on eBay →</a>
                        </div>

                        {/* Velocity Badge */}
                        <div style={{ padding: '8px 16px', backgroundColor: item.salesCount > 1 ? '#fff5f5' : '#f7fafc', borderRadius: '12px', border: '1px solid', borderColor: item.salesCount > 1 ? '#feb2b2' : '#e2e8f0', textAlign: 'center', minWidth: '120px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: item.salesCount > 1 ? '#c53030' : '#4a5568', textTransform: 'uppercase', marginBottom: '4px' }}>Velocity</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: item.salesCount > 1 ? '#c53030' : '#2d3748' }}>
                                {item.salesCount} Sales {item.salesCount > 1 && '🔥'}
                            </div>
                        </div>

                        {/* Stats Group */}
                        <div style={{ display: 'flex', gap: '40px', alignItems: 'center', textAlign: 'center', paddingRight: '40px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#4a5568', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d3748' }}>{item.price}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#4a5568', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Sold</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#718096' }}>{item.soldDate}</div>
                            </div>
                        </div>

                        {/* Snipe Action */}
                        <div style={{ paddingLeft: '20px', borderLeft: '1px solid #e2e8f0' }}>
                            <button 
                                onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.itemUrl)}`, '_blank')}
                                style={{ backgroundColor: 'var(--text-main)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                Snipe Detail
                            </button>
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
