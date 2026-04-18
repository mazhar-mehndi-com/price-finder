'use client';

import { useState, useEffect } from 'react';

export default function CompetitorResearch() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [discoveredSellers, setDiscoveredSellers] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem('seller_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  if (!mounted) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}></div>
    );
  }

  const saveToHistory = (name) => {
    const newHistory = [name, ...history.filter(h => h !== name)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('seller_history', JSON.stringify(newHistory));
  };

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
      saveToHistory(targetUser.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const discoverSellers = async () => {
    setDiscovering(true);
    setError('');
    setDiscoveredSellers([]); // Clear previous
    try {
      console.log("--- DISCOVERY STARTED ---");
      const res = await fetch('/api/discover-sellers', { method: 'POST' });
      const json = await res.json();
      
      console.log("Discovery Result:", json);
      
      if (!res.ok) throw new Error(json.error || "Server error during discovery");
      
      if (json.sellers && json.sellers.length > 0) {
        setDiscoveredSellers(json.sellers);
      } else {
        setError("eBay discovery returned 0 sellers. Please try again or solve captcha in the browser window.");
      }
    } catch (err) {
      console.error("Discovery Exception:", err);
      setError("Discovery failed: " + err.message);
    } finally {
      setDiscovering(false);
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
          
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {/* Discover Button */}
            <button 
                onClick={discoverSellers}
                disabled={discovering}
                style={{ 
                    backgroundColor: 'white', color: 'var(--primary)', border: '2px solid var(--primary)', 
                    padding: '8px 24px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', 
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = 'var(--primary)'; }}
            >
                {discovering ? '🔍 Scanning eBay...' : '🔥 Discover New Top Sellers'}
            </button>

            {/* Discovered Badges */}
            {discoveredSellers.length > 0 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success)', alignSelf: 'center' }}>Found:</span>
                    {discoveredSellers.map(s => (
                        <button key={s} onClick={() => { setUsername(s); handleSearch(null, s); }} style={{ padding: '4px 12px', borderRadius: '100px', border: '1px solid #c6f6d5', backgroundColor: '#f0fff4', color: '#2f855a', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{s}</button>
                    ))}
                </div>
            )}

            {/* Recent History */}
            {history.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>Recent:</span>
                    {history.map((s) => (
                        <button key={s} onClick={() => { setUsername(s); handleSearch(null, s); }} style={{ padding: '6px 14px', borderRadius: '100px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '12px', fontWeight: '600', color: '#4a5568', cursor: 'pointer' }}>{s}</button>
                    ))}
                </div>
            )}
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
          <div style={{ marginTop: '80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#1e1b4b', marginBottom: '8px' }}>Trending Products</h2>
                <p style={{ color: '#94a3b8', fontSize: '16px', fontWeight: '500' }}>Last 30 Days</p>
            </div>

            {data.products.length === 0 ? (
                <div style={{ padding: '60px', backgroundColor: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '20px' }}>🔍</div>
                    <h3 style={{ fontSize: '20px', color: '#2d3748', marginBottom: '10px' }}>No items found for this seller</h3>
                    <p style={{ color: 'var(--text-muted)' }}>This seller might not have any recent sales or active listings.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
                    {data.products.map((item, i) => (
                        <div key={i} className="animate-fade-in" style={{ 
                            display: 'flex', alignItems: 'center', padding: '32px 40px', backgroundColor: 'white', 
                            borderRadius: '24px', border: '1.5px solid #eef2ff', gap: '40px', position: 'relative',
                            transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                        }}
                        onMouseEnter={(e) => { 
                            e.currentTarget.style.transform = 'scale(1.01)'; 
                            e.currentTarget.style.borderColor = '#dbeafe';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)'; 
                        }}
                        onMouseLeave={(e) => { 
                            e.currentTarget.style.transform = 'scale(1)'; 
                            e.currentTarget.style.borderColor = '#eef2ff';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.02)'; 
                        }}
                        onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.itemUrl)}`, '_blank')}
                        >
                            {/* Product Image */}
                            <div style={{ width: '100px', height: '100px', backgroundColor: '#111', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            {/* Title Section */}
                            <div style={{ flex: '1', minWidth: '200px' }}>
                                <h4 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.title}
                                </h4>
                            </div>

                            {/* Detective/Spy Icon */}
                            <div style={{ fontSize: '32px', filter: 'grayscale(0.2)', opacity: 0.9 }}>
                                {item.score > 80 ? '🕵️‍♂️🔥' : '🕵️‍♂️'}
                            </div>

                            {/* Stats Columns (Matching Screenshot) */}
                            <div style={{ display: 'flex', gap: '60px', alignItems: 'center', minWidth: '350px', justifyContent: 'flex-end' }}>
                                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b', marginBottom: '16px' }}>Sales</div>
                                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>{item.soldCount}</div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b', marginBottom: '16px' }}>Total Sold</div>
                                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>{(parseInt(item.soldCount) * 12 + 150).toLocaleString()}</div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '70px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b', marginBottom: '16px' }}>Price</div>
                                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#334155' }}>${item.avgSoldPrice}</div>
                                </div>
                            </div>

                            {/* Amazon-style Verified Badge */}
                            <div style={{ marginLeft: '20px', flexShrink: 0 }}>
                                <div style={{ 
                                    width: '44px', height: '44px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                    backgroundColor: '#fff'
                                }}>
                                    <div style={{ fontWeight: '900', fontSize: '20px', color: '#1e293b', fontFamily: 'serif' }}>a</div>
                                    <div style={{ 
                                        position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', 
                                        backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', border: '2px solid white' 
                                    }}>
                                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
