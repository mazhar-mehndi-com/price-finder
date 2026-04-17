'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ProductContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    if (!url) {
      setError('No product URL provided.');
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
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

    fetchProduct();
  }, [url]);

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

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0064d2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
        <p>Scraping eBay product details...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', backgroundColor: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: '8px', textAlign: 'center' }}>
        <h3 style={{ color: '#c00' }}>Error</h3>
        <p>{error}</p>
        <Link href="/" style={{ color: '#0064d2' }}>Go Back</Link>
    </div>
  );

  if (!data) return null;

  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Georgia, serif' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#666', fontSize: '14px', fontFamily: 'sans-serif' }}>← Back to Search</Link>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {copyStatus && <span style={{ color: '#28a745', fontSize: '13px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>{copyStatus}</span>}
              <button onClick={copyAll} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif' }}>📋 Copy All</button>
          </div>
      </header>

      <article>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '10px' }}>
            <h1 style={{ fontSize: '2.2rem', margin: 0, lineHeight: '1.2', color: '#111' }}>{data.Title}</h1>
            <button onClick={() => copyToClipboard(data.Title, 'Title')} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Copy</button>
          </div>
          
          <div style={{ fontSize: '1.4rem', color: '#0064d2', fontWeight: 'bold', marginBottom: '10px', fontFamily: 'sans-serif' }}>Price: {data.Price}</div>
          <div style={{ fontSize: '1rem', color: '#555', marginBottom: '30px', fontFamily: 'sans-serif' }}><strong>eBay Category ID:</strong> {data.Category}</div>

          {data.Images && data.Images.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                    {data.Images.map((img, i) => (
                        <div key={i} style={{ height: '180px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
                            <img src={img} alt={`Gallery ${i}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {data.Specs && Object.keys(data.Specs).length > 0 && (
              <section style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'sans-serif' }}>Item Specifics</h2>
                    <button onClick={() => {
                        const txt = Object.entries(data.Specs).map(([k,v])=>`${k}: ${v}`).join('\n');
                        copyToClipboard(txt, 'Specs');
                    }} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Copy</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', fontFamily: 'sans-serif' }}>
                      {Object.entries(data.Specs).map(([k, v]) => (
                          <div key={k}><strong>{k}:</strong> {v}</div>
                      ))}
                  </div>
              </section>
          )}

          {data.Description && (
              <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'sans-serif' }}>Description</h2>
                    <button onClick={() => copyToClipboard(data.Description, 'Description')} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Copy</button>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#444', lineHeight: '1.8' }}>{data.Description}</div>
              </section>
          )}
      </article>
    </main>
  );
}

export default function ProductDetail() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '100px' }}>Loading...</div>}>
      <ProductContent />
    </Suspense>
  );
}
