'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ProductContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [inputUrl, setInputUrl] = useState(url || '');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (url) {
      fetchProduct(url);
    }
  }, [url]);

  const fetchProduct = async (scrapeUrl) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch product');
      setData(json.items[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputUrl) return;
    fetchProduct(inputUrl);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`Copied ${label}!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
    }
  };

  const copyAll = () => {
    if (!data) return;
    let fullText = `# ${data.Title}\n\nCategory ID: ${data.Category}\n\nPrice: ${data.Price}\n\n`;
    if (data.Specs && Object.keys(data.Specs).length > 0) {
        fullText += `## Specifications\n`;
        Object.entries(data.Specs).forEach(([k, v]) => { fullText += `- ${k}: ${v}\n`; });
        fullText += `\n`;
    }
    if (data.Description) fullText += `## Description\n\n${data.Description}\n`;
    copyToClipboard(fullText, 'All Content');
  };

  if (!mounted) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}></div>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <section className="hero-section">
        <h1 className="hero-title">
          Scrape <span style={{ color: 'var(--primary)' }}>Post</span>.
        </h1>
        <p className="hero-subtitle">
          Paste an eBay listing URL to extract all details for easy copying.
        </p>

        <div className="search-form-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste eBay product URL (e.g. https://www.ebay.com/itm/...)"
              required
              className="search-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="search-btn"
            >
              {loading ? 'Scraping...' : 'Scrape'}
            </button>
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Extracting listing data...</p>
          </div>
        )}

        {error && (
          <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', backgroundColor: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '12px', textAlign: 'center' }}>
              <h3 style={{ color: '#c00', marginBottom: '10px' }}>Error</h3>
              <p>{error}</p>
          </div>
        )}

        {data && (
          <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '40px auto', backgroundColor: '#fff', padding: 'clamp(20px, 5vw, 40px)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', fontFamily: 'Georgia, serif' }}>
            <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {copyStatus && <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>{copyStatus}</span>}
                    <button onClick={copyAll} style={{ backgroundColor: 'var(--success)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif', boxShadow: 'var(--shadow-sm)' }}>📋 Copy All</button>
                </div>
            </header>

            <article>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', margin: 0, lineHeight: '1.2', color: 'var(--text-main)', flex: '1', minWidth: '250px' }}>{data.Title}</h1>
                  <button onClick={() => copyToClipboard(data.Title, 'Title')} style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'sans-serif', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>Copy</button>
                </div>
                
                <div style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '10px', fontFamily: 'sans-serif' }}>Price: {data.Price}</div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '30px', fontFamily: 'sans-serif' }}><strong>eBay Category ID:</strong> {data.Category}</div>

                {data.Images && data.Images.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                          {data.Images.map((img, i) => (
                              <div key={i} style={{ height: '140px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfcfc' }}>
                                  <img src={img} alt={`Gallery ${i}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                              </div>
                          ))}
                        </div>
                    </div>
                )}

                {data.Specs && Object.keys(data.Specs).length > 0 && (
                    <section style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--text-main)', paddingBottom: '8px', marginBottom: '20px' }}>
                          <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'sans-serif' }}>Item Specifics</h2>
                          <button onClick={() => {
                              const txt = Object.entries(data.Specs).map(([k,v])=>`${k}: ${v}`).join('\n');
                              copyToClipboard(txt, 'Specs');
                          }} style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'sans-serif', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>Copy</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px', fontFamily: 'sans-serif' }}>
                            {Object.entries(data.Specs).map(([k, v]) => (
                                <div key={k} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}><strong>{k}:</strong> {v}</div>
                            ))}
                        </div>
                    </section>
                )}

                {data.Description && (
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--text-main)', paddingBottom: '8px', marginBottom: '20px' }}>
                          <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'sans-serif' }}>Description</h2>
                          <button onClick={() => copyToClipboard(data.Description, 'Description')} style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'sans-serif', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>Copy</button>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#444', lineHeight: '1.8', fontSize: '16px' }}>{data.Description}</div>
                    </section>
                )}
            </article>
          </div>
        )}
      </main>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ScrapePost() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>}>
      <ProductContent />
    </Suspense>
  );
}
