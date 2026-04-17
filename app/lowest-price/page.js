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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data.');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ItemCard = ({ item, platformName }) => (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: '12px', 
      overflow: 'hidden',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #eee',
      height: '100%'
    }}>
      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', position: 'relative' }}>
          {item.image ? (
            <img src={item.image} alt={item.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
              No Image
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}>
            ${item.price}
          </div>
        </div>
        <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', height: '60px', overflow: 'hidden', color: '#333', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </h3>
        <div style={{ marginTop: 'auto' }}>
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'block',
              textAlign: 'center',
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              color: '#0064d2',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            View on {platformName}
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#111', fontSize: '2.5rem', marginBottom: '10px' }}>Lowest Price Finder</h1>
        <p style={{ color: '#666' }}>Compare multiple deals across eBay, Amazon, and AliExpress</p>
      </div>

      <div style={{ 
        backgroundColor: '#fff', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        marginBottom: '40px'
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter product title or keywords..."
            required
            style={{ 
                flex: 1, 
                padding: '15px', 
                borderRadius: '8px', 
                border: '1px solid #ddd',
                fontSize: '18px',
                outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
                padding: '0 30px',
                backgroundColor: loading ? '#ccc' : '#0064d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
            }}
          >
            {loading ? 'Searching...' : 'Compare'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', color: '#c00', textAlign: 'center', marginBottom: '30px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0064d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ fontSize: '18px', color: '#444' }}>Gathering deals from eBay, Amazon, and AliExpress...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {results && (
        <div>
          {results.lowest && (
            <div style={{ 
              backgroundColor: '#e7f3ff', 
              padding: '25px', 
              borderRadius: '12px', 
              border: '2px solid #0064d2',
              marginBottom: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#004085', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: '#cfe2ff', padding: '4px 8px', borderRadius: '4px' }}>BEST DEAL FOUND</span>
                  <h2 style={{ margin: '10px 0', color: '#004085', fontSize: '1.8rem' }}>
                    ${results.lowest.price} on {results.lowest.platform}
                  </h2>
                  <p style={{ margin: 0, color: '#444', fontWeight: '500' }}>{results.lowest.title}</p>
                </div>
                {results.lowest.image && (
                   <img src={results.lowest.image} alt="Best deal" style={{ width: '80px', height: '80px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '8px', padding: '5px' }} />
                )}
              </div>
              <a 
                href={results.lowest.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  backgroundColor: '#0064d2', 
                  color: 'white', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  fontSize: '18px'
                }}
              >
                Go to the Best Deal →
              </a>
            </div>
          )}

          {results.platforms.map((p, idx) => (
            <div key={idx} style={{ marginBottom: '50px' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '20px', 
                paddingBottom: '10px', 
                borderBottom: '2px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {p.name} Deals
                <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                  ({p.items.length} items found)
                </span>
              </h2>
              
              {p.error && p.items.length === 0 ? (
                <div style={{ padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '12px', textAlign: 'center', color: '#999' }}>
                  {p.error}
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
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
      )}
    </main>
  );
}
