'use client';

import { useState, useEffect } from 'react';

export default function LowestPrice() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ platforms: [], lowest: null });
  const [error, setError] = useState('');
  const [currentPlatform, setCurrentPlatform] = useState('');

  const platformsList = ['eBay', 'Amazon', 'AliExpress', 'Walmart', 'Etsy', 'Costco', 'Temu', 'Target', 'Best Buy'];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    // Initialize results structure
    const initialPlatforms = platformsList.map(name => ({ name, items: [], loading: true, error: null }));
    setResults({ platforms: initialPlatforms, lowest: null });

    // Fetch platforms one by one for maximum stability and CAPTCHA control
    let currentLowest = null;

    for (const platform of platformsList) {
      setCurrentPlatform(platform);
      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: query, platform }),
        });

        if (!response.ok) throw new Error(`Failed to fetch ${platform}`);
        const data = await response.json();

        setResults(prev => {
          const updatedPlatforms = prev.platforms.map(p => 
            p.name === platform ? { ...p, items: data.items, loading: false, error: data.error } : p
          );

          // Update lowest price
          data.items.forEach(item => {
            if (!currentLowest || item.price < currentLowest.price) {
              currentLowest = { platform: data.platform, ...item };
            }
          });

          return { platforms: updatedPlatforms, lowest: currentLowest };
        });
      } catch (err) {
        console.error(err);
        setResults(prev => ({
          ...prev,
          platforms: prev.platforms.map(p => p.name === platform ? { ...p, loading: false, error: 'Connection Error' } : p)
        }));
      }
    }

    setLoading(false);
    setCurrentPlatform('');
  };

  const ItemCard = ({ item, platformName }) => {
    const platformColors = {
      'eBay': '#0064D2', 'Amazon': '#FF9900', 'AliExpress': '#E62E04',
      'Walmart': '#0071CE', 'Etsy': '#F1641E', 'Costco': '#E31837', 
      'Temu': '#FF6E00', 'Target': '#CC0000', 'Best Buy': '#FFF200'
    };
    const platformColor = platformColors[platformName] || '#333';
    const textColor = platformName === 'Best Buy' ? '#000' : 'inherit';
    
    return (
      <div className="animate-fade-in" style={{ 
        backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', position: 'relative', backgroundColor: '#fcfcfc', borderRadius: '12px' }}>
            {item.image ? (
              <img src={item.image} alt={item.title} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '10px', color: '#999' }}>No Image</div>
            )}
            <div style={{ 
                position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(4px)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '20px', 
                fontWeight: '700', fontSize: '13px', border: '1px solid var(--border)'
            }}>
              ${item.price}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
             <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: platformColor }}></div>
             <span style={{ fontSize: '10px', fontWeight: '700', color: platformColor, textTransform: 'uppercase' }}>{platformName}</span>
          </div>
          <h3 style={{ fontSize: '12px', fontWeight: '500', margin: '0 0 12px 0', color: 'var(--text-main)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '34px' }}>
            {item.title}
          </h3>
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg)', color: 'var(--text-main)', textDecoration: 'none', fontWeight: '600', fontSize: '12px', border: '1px solid var(--border)' }}>
            View Deal
          </a>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <section style={{ padding: '60px 20px', textAlign: 'center', background: 'radial-gradient(circle at 50% -20%, #e7f3ff 0%, var(--bg) 50%)' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '12px', color: 'var(--text-main)' }}>
          Find the <span style={{ color: 'var(--primary)' }}>lowest</span> price.
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 32px', lineHeight: '1.5' }}>
          Real-time price comparison across top US stores.
        </p>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', padding: '6px', backgroundColor: 'white', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What are you looking for?" required style={{ flex: 1, padding: '10px 20px', borderRadius: '12px', border: 'none', fontSize: '16px', outline: 'none' }} />
            <button type="submit" disabled={loading} style={{ padding: '0 24px', backgroundColor: loading ? '#D1D5DB' : 'var(--text-main)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', marginBottom: '40px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '100px', display: 'inline-block', left: '50%', transform: 'translateX(-50%)', position: 'relative' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
              Currently searching: <strong style={{ textTransform: 'uppercase' }}>{currentPlatform}</strong>...
            </span>
          </div>
        )}

        {results.lowest && (
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--text-main)', padding: '30px', borderRadius: '24px', color: 'white', marginBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', backgroundColor: 'var(--success)', padding: '3px 10px', borderRadius: '100px' }}>BEST DEAL</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>${results.lowest.price} <span style={{ fontSize: '1.2rem', fontWeight: '400', color: 'rgba(255,255,255,0.5)' }}>on {results.lowest.platform}</span></h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{results.lowest.title}</p>
              <a href={results.lowest.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: 'white', color: 'var(--text-main)', padding: '12px 30px', borderRadius: '10px', textDecoration: 'none', fontWeight: '800', display: 'inline-block', fontSize: '14px' }}>Get This Deal →</a>
            </div>
            {results.lowest.image && (
               <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '16px', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <img src={results.lowest.image} alt="Best deal" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
               </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
          {results.platforms.map((p, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{p.name}</h2>
                {p.loading ? (
                    <div style={{ width: '16px', height: '16px', border: '2px solid #E5E7EB', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.items.length} items found</span>
                )}
              </div>
              
              {!p.loading && p.error && p.items.length === 0 ? (
                <div style={{ padding: '40px', backgroundColor: 'white', border: '1px dashed var(--border)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {p.error}
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '16px' 
                }}>
                  {p.items.map((item, iIdx) => (
                    <ItemCard key={iIdx} item={item} platformName={p.name} />
                  ))}
                  {p.loading && Array(5).fill(0).map((_, i) => (
                    <div key={i} style={{ height: '280px', backgroundColor: '#eee', borderRadius: '16px', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}
