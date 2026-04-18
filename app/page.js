'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as xlsx from 'xlsx';

export default function Home() {
  const [url, setUrl] = useState('');
  const [deep, setDeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useState(() => {
    // This runs once on the client or server during initialization
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}></div>
    );
  }

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setMessage({ text: 'Scraping items... please wait.', type: 'info' });
    setItems([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, deep }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to scrape.');
      }

      const data = await response.json();
      
      // If it's a single item page, we can redirect to the blog viewer
      if (url.includes('/itm/') && data.items.length === 1) {
          router.push(`/product?url=${encodeURIComponent(url)}`);
          return;
      }

      setItems(data.items);
      setMessage({ text: `Success! Found ${data.items.length} items.`, type: 'success' });
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (items.length === 0) return;
    const excelData = items.map(item => {
        const { Specs, FullDescription, ItemUrl, Images, ...rest } = item;
        return rest;
    });
    const ws = xlsx.utils.json_to_sheet(excelData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "BulkUpload");
    xlsx.writeFile(wb, "ebay_bulk_upload.xlsx");
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <section className="hero-section">
        <h1 className="hero-title">
          eBay <span style={{ color: 'var(--primary)' }}>Scraper</span> & Viewer.
        </h1>
        <p className="hero-subtitle">
          Extract product data and generate bulk upload files instantly.
        </p>

        <div className="search-form-container">
          <form onSubmit={handleScrape} className="search-form" style={{ flexDirection: 'column', gap: '15px', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste eBay Search or Product URL..."
                required
                className="search-input"
                style={{ flex: 1, border: '1px solid var(--border)', minWidth: '200px' }}
                />
                <button
                type="submit"
                disabled={loading}
                className="search-btn"
                style={{ padding: '12px 24px' }}
                >
                {loading ? '🔍 Processing...' : (url.includes('/itm/') ? '📄 View Blog Style' : '🚀 Scrape Items')}
                </button>
            </div>

            {!url.includes('/itm/') && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', alignSelf: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                    <span>Deep Scrape (Specs & Descriptions for first 3 items)</span>
                </label>
            )}
          </form>
        </div>
      </section>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        {message.text && (
            <div className="animate-fade-in" style={{
            margin: '20px auto',
            maxWidth: '600px',
            padding: '12px 20px',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: message.type === 'error' ? '#ffdce0' : '#e7f3ff',
            color: message.type === 'error' ? '#c00' : 'var(--primary)',
            border: `1px solid ${message.type === 'error' ? '#ffc0c0' : '#bee3f8'}`
            }}>
            {message.text}
            </div>
        )}

        {items.length > 0 && (
            <div style={{ marginTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Results ({items.length})</h2>
                <button onClick={handleDownload} style={{ padding: '10px 24px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: 'var(--shadow-sm)' }}>
                📥 Download Excel
                </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                {items.map((item, idx) => (
                <div key={idx} className="animate-fade-in" style={{ 
                    backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => { if(item.ItemUrl) router.push(`/product?url=${encodeURIComponent(item.ItemUrl)}`) }}
                >
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', position: 'relative', backgroundColor: '#fcfcfc', borderRadius: '12px' }}>
                            {item.PicURL ? (
                            <img src={item.PicURL} alt={item.Title} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                            ) : (
                            <div style={{ fontSize: '10px', color: '#999' }}>No Image</div>
                            )}
                            <div style={{ 
                                position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(255,255,255,0.9)', 
                                backdropFilter: 'blur(4px)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '20px', 
                                fontWeight: '700', fontSize: '13px', border: '1px solid var(--border)'
                            }}>
                            ${item.Price}
                            </div>
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', color: 'var(--text-main)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '40px' }}>
                            {item.Title}
                        </h3>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg)', color: 'var(--primary)', fontSize: '12px', fontWeight: '700', border: '1px solid var(--border)' }}>
                            View Details →
                        </div>
                    </div>
                </div>
                ))}
            </div>
            </div>
        )}
      </main>
    </div>
  );
}
