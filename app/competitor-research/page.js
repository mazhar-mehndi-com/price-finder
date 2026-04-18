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

  const handleSearch = async (e, directUser = null) => {
    if (e) e.preventDefault();
    const targetUser = directUser || username;
    if (!targetUser) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser.trim() }),
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
          Market <span style={{ color: 'var(--primary)' }}>Intelligence</span>.
        </h1>
        <p className="hero-subtitle">
          Advanced analytics and trending score for eBay sellers.
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
              {loading ? 'Analyzing...' : 'Analyze Seller'}
            </button>
          </form>
          
          {/* Quick Suggestions */}
          <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '5px' }}>Suggested:</span>
            {['officialhpauctions', 'bhfo', 'eero_official', 'spigen_inc', 'anker_official'].map((s) => (
                <button 
                  key={s}
                  onClick={() => { setUsername(s); handleSearch(null, s); }}
                  disabled={loading}
                  style={{ 
                    padding: '6px 14px', borderRadius: '100px', border: '1px solid #e2e8f0', 
                    backgroundColor: '#fff', fontSize: '12px', fontWeight: '600', color: 'var(--primary)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7fafc'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  {s}
                </button>
            ))}
          </div>
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
          {/* Market Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {[
                { label: 'Seller', value: data.username, color: 'var(--primary)' },
                { label: 'Market STR', value: data.stats.marketStr, color: 'var(--success)' },
                { label: 'Total Sold', value: data.stats.totalSold, color: '#2d3748' },
                { label: 'Unique Items', value: data.stats.uniqueProducts, color: '#666' },
            ].map((stat, i) => (
                <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                </div>
            ))}
          </div>

          {/* Analysis List */}
          <div style={{ marginTop: '60px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1a202c', marginBottom: '8px' }}>Winning Products</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>ZIK-Style Market Intelligence & Trending Analysis</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.products.map((item, i) => (
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

                        {/* Title & Insight */}
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#2d3748', lineHeight: '1.4', marginBottom: '8px' }}>{item.title}</h4>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: item.score > 70 ? '#f0fff4' : '#f7fafc', color: item.score > 70 ? '#2f855a' : '#718096', border: '1px solid', borderColor: item.score > 70 ? '#c6f6d5' : '#e2e8f0' }}>
                                    {item.trend}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💡 {item.insight}</span>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', textAlign: 'center', paddingRight: '20px' }}>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#4a5568', marginBottom: '4px', textTransform: 'uppercase' }}>Sold</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)' }}>{item.soldCount}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#4a5568', marginBottom: '4px', textTransform: 'uppercase' }}>STR</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>{item.sellThroughRate}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#4a5568', marginBottom: '4px', textTransform: 'uppercase' }}>Avg Price</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#2d3748' }}>${item.avgSoldPrice}</div>
                            </div>
                        </div>

                        {/* Trending Score */}
                        <div style={{ textAlign: 'center', width: '80px', borderLeft: '1px solid #f0f0f0', paddingLeft: '20px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Score</div>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: item.score > 80 ? '#c53030' : 'var(--text-main)' }}>{item.score}</div>
                        </div>

                        {/* Snipe Action */}
                        <div style={{ paddingLeft: '10px' }}>
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
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
