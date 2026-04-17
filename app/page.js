'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as xlsx from 'xlsx';

export default function Home() {
  const [url, setUrl] = useState('');
  const [deep, setDeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [items, setItems] = useState([]);
  const router = useRouter();

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
    <main style={{ maxWidth: '1000px', margin: '50px auto', backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h1 style={{ color: '#0064d2', textAlign: 'center', marginBottom: '30px' }}>🛒 eBay Scraper & Blog Viewer</h1>
      
      <form onSubmit={handleScrape} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label style={{ fontWeight: 'bold' }}>Paste eBay Search or Product URL:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
            <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.ebay.com/sch/..."
            required
            style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
            />
            <button
            type="submit"
            disabled={loading}
            style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#ccc' : '#0064d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
            }}
            >
            {loading ? '🔍 Processing...' : (url.includes('/itm/') ? '📄 View Blog Style' : '🚀 Scrape Items')}
            </button>
        </div>

        {!url.includes('/itm/') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                <span>Deep Scrape (Specs & Descriptions for first 5 items)</span>
            </label>
        )}
      </form>

      {message.text && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          borderRadius: '4px',
          textAlign: 'center',
          backgroundColor: message.type === 'error' ? '#ffdce0' : '#e7f3ff',
          color: message.type === 'error' ? '#c00' : '#004085'
        }}>
          {message.text}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2>Results ({items.length})</h2>
             <button onClick={handleDownload} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
               📥 Download Excel
             </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '10px', cursor: 'pointer' }} onClick={() => { if(item.ItemUrl) router.push(`/product?url=${encodeURIComponent(item.ItemUrl)}`) }}>
                {item.PicURL && <img src={item.PicURL} alt={item.Title} style={{ width: '100%', height: '150px', objectFit: 'contain' }} />}
                <h4 style={{ fontSize: '14px', margin: '10px 0', height: '40px', overflow: 'hidden' }}>{item.Title}</h4>
                <div style={{ fontWeight: 'bold' }}>${item.Price}</div>
                <div style={{ fontSize: '11px', color: '#0064d2', marginTop: '5px' }}>Click to View Detail →</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
