'use client';

import { useState } from 'react';

export default function MarketResearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: query }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch insights');

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1a202c' }}>
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '12px' }}>Professional Market Research</h1>
        <p style={{ color: '#718096', fontSize: '18px' }}>Deep eBay analytics: Demand, Top Sellers, and Condition breakdowns.</p>
      </header>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '700px', margin: '0 auto 60px auto' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search professional insights (e.g. Vintage Camera, RTX 4090)..."
          style={{ flex: 1, padding: '16px 24px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s' }}
          onFocus={(e) => e.target.style.borderColor = '#3182ce'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ 
            padding: '16px 40px', borderRadius: '14px', border: 'none', 
            backgroundColor: '#1a202c', color: 'white', fontWeight: '700', cursor: 'pointer',
            fontSize: '16px', transition: 'transform 0.1s, opacity 0.2s',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Analyzing...' : 'Get Insights'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '24px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '16px', color: '#c53030', textAlign: 'center', marginBottom: '40px', fontSize: '16px', fontWeight: '500' }}>
          ⚠️ {error}
        </div>
      )}

      {data && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* Top Row: Demand & Health */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>Demand Index (Sell-Through)</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '48px', fontWeight: '800', color: data.stats.sellThroughRate > 50 ? '#38a169' : '#e53e3e' }}>{data.stats.sellThroughRate}%</span>
                    <span style={{ color: '#a0aec0', fontWeight: '500' }}>of listings sold</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#edf2f7', borderRadius: '4px', marginTop: '20px', overflow: 'hidden' }}>
                    <div style={{ width: `${data.stats.sellThroughRate}%`, height: '100%', backgroundColor: data.stats.sellThroughRate > 50 ? '#38a169' : '#e53e3e' }}></div>
                </div>
            </div>

            <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>Average Market Value</div>
                <div style={{ fontSize: '48px', fontWeight: '800', color: '#2d3748' }}>${data.stats.avgSoldPrice}</div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                    <div style={{ fontSize: '13px', color: '#718096' }}>Asking: <span style={{ fontWeight: '700', color: '#2b6cb0' }}>${data.stats.avgActivePrice}</span></div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>Free Ship: <span style={{ fontWeight: '700', color: '#805ad5' }}>{data.stats.freeShippingRate}%</span></div>
                </div>
            </div>
          </div>

          {/* Middle Row: Breakdown & Top Sellers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
            
            {/* Top Sellers Table */}
            <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #edf2f7' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Top Market Competitors</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f7fafc' }}>
                            <th style={{ padding: '12px 0', color: '#718096', fontSize: '14px' }}>Seller Username</th>
                            <th style={{ padding: '12px 0', color: '#718096', fontSize: '14px' }}>Recent Sales</th>
                            <th style={{ padding: '12px 0', color: '#718096', fontSize: '14px', textAlign: 'right' }}>Market Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.topSellers.map((seller, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f7fafc' }}>
                                <td style={{ padding: '16px 0', fontWeight: '600', color: '#3182ce' }}>{seller.username}</td>
                                <td style={{ padding: '16px 0', fontWeight: '500' }}>{seller.count} items</td>
                                <td style={{ padding: '16px 0', textAlign: 'right' }}>
                                    <span style={{ padding: '4px 12px', backgroundColor: '#ebf8ff', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#2b6cb0' }}>
                                        {((seller.count / data.stats.soldCount) * 100).toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Condition Breakdown */}
            <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #edf2f7' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Condition Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {[
                        { label: 'Brand New', count: data.conditions.New, color: '#38a169' },
                        { label: 'Used / Refurbished', count: data.conditions.Used, color: '#d69e2e' },
                        { label: 'Other / Parts', count: data.conditions.Other, color: '#a0aec0' }
                    ].map((cond, i) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                <span>{cond.label}</span>
                                <span>{((cond.count / data.stats.soldCount) * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ height: '12px', backgroundColor: '#edf2f7', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${(cond.count / data.stats.soldCount) * 100}%`, height: '100%', backgroundColor: cond.color }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Bottom Row: Recent Sales Samples */}
          <div style={{ padding: '30px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #edf2f7' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Actual Sold Prices (Live Samples)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {data.sampleSold.map((item, i) => (
                    <div key={i} style={{ padding: '16px', backgroundColor: '#f7fafc', borderRadius: '16px', border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#2d3748', marginBottom: '4px' }}>${item.price}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#38a169', marginBottom: '8px', textTransform: 'uppercase' }}>Sold by: {item.seller}</div>
                        <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '34px' }}>
                            {item.title}
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '12px', fontSize: '11px', color: '#3182ce', fontWeight: '700', textTransform: 'uppercase', textDecoration: 'none' }}>View Original Listing →</a>
                    </div>
                ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
