'use client';

import { useState } from 'react';

export default function LowestPrice() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: query }),
      });

      if (!response.ok) throw new Error('Failed to fetch comparison data.');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ItemCard = ({ item, platformName }) => {
    const platformColor = platformName === 'eBay' ? '#0064D2' : platformName === 'Amazon' ? '#FF9900' : '#E62E04';
    
    return (
      <div className="animate-fade-in" style={{ 
        backgroundColor: '#fff', 
        borderRadius: '16px', 
        overflow: 'hidden',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
      }}
      >
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', position: 'relative', backgroundColor: '#fcfcfc', borderRadius: '12px' }}>
            {item.image ? (
              <img src={item.image} alt={item.title} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '12px', color: '#999' }}>No Image Available</div>
            )}
            <div style={{ 
                position: 'absolute', 
                bottom: '10px', 
                right: '10px', 
                backgroundColor: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(4px)',
                color: 'var(--text-main)', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontWeight: '700', 
                fontSize: '15px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
              ${item.price}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: platformColor }}></div>
             <span style={{ fontSize: '11px', fontWeight: '700', color: platformColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{platformName}</span>
          </div>

          <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              margin: '0 0 16px 0', 
              color: 'var(--text-main)', 
              lineHeight: '1.5',
              display: '-webkit-box', 
              WebkitLineClamp: 2, 
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
          }}>
            {item.title}
          </h3>
          
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              marginTop: 'auto',
              display: 'block',
              textAlign: 'center',
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-main)',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'all 0.2s',
              border: '1px solid var(--border)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eee'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
          >
            Check Deal
          </a>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Hero Section */}
      <section style={{ 
          padding: '80px 20px', 
          textAlign: 'center',
          background: 'radial-gradient(circle at 50% -20%, #e7f3ff 0%, var(--bg) 50%)'
      }}>
        <h1 style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 4rem)', 
            fontWeight: '800', 
            letterSpacing: '-2px', 
            marginBottom: '16px',
            color: 'var(--text-main)'
        }}>
          Find the <span style={{ color: 'var(--primary)' }}>lowest</span> price.
        </h1>
        <p style={{ 
            fontSize: '18px', 
            color: 'var(--text-muted)', 
            maxWidth: '600px', 
            margin: '0 auto 40px',
            lineHeight: '1.6'
        }}>
          DealScout scans eBay, Amazon, and AliExpress in real-time to find you the best possible deals.
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <form onSubmit={handleSearch} style={{ 
              display: 'flex', 
              padding: '8px', 
              backgroundColor: 'white', 
              borderRadius: '20px', 
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)'
          }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for any product..."
              required
              style={{ 
                  flex: 1, 
                  padding: '12px 24px', 
                  borderRadius: '16px', 
                  border: 'none',
                  fontSize: '18px',
                  outline: 'none',
                  color: 'var(--text-main)'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                  padding: '0 32px',
                  backgroundColor: loading ? '#D1D5DB' : 'var(--text-main)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s active'
              }}
            >
              {loading ? 'Scanning...' : 'Search'}
            </button>
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
        {error && (
          <div style={{ padding: '20px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#991B1B', textAlign: 'center', marginBottom: '40px' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid #E5E7EB', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }}></div>
            <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>Aggregating global prices...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {results && (
          <div className="animate-fade-in">
            {results.lowest && (
              <div style={{ 
                backgroundColor: 'var(--text-main)', 
                padding: '40px', 
                borderRadius: '32px', 
                color: 'white',
                marginBottom: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '30px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }}>
                <div style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', backgroundColor: 'var(--success)', padding: '4px 12px', borderRadius: '100px' }}>TOP PICK</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Cheapest match found</span>
                  </div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '12px', letterSpacing: '-1px' }}>
                    ${results.lowest.price} <span style={{ fontSize: '1.5rem', fontWeight: '400', color: 'rgba(255,255,255,0.5)' }}>on {results.lowest.platform}</span>
                  </h2>
                  <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.4' }}>{results.lowest.title}</p>
                  <a 
                    href={results.lowest.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      backgroundColor: 'white', 
                      color: 'var(--text-main)', 
                      padding: '16px 40px', 
                      borderRadius: '12px', 
                      textDecoration: 'none',
                      fontWeight: '800',
                      display: 'inline-block',
                      fontSize: '16px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Get This Deal →
                  </a>
                </div>
                {results.lowest.image && (
                   <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '24px', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <img src={results.lowest.image} alt="Best deal" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                   </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
              {results.platforms.map((p, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{p.name}</h2>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{p.items.length} items found</span>
                  </div>
                  
                  {p.error && p.items.length === 0 ? (
                    <div style={{ padding: '60px', backgroundColor: 'white', border: '1px dashed var(--border)', borderRadius: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No results currently available from {p.name}.
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(5, 1fr)', 
                      gap: '20px' 
                    }}>

                      {p.items.map((item, iIdx) => (
                        <ItemCard key={iIdx} item={item} platformName={p.name} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
