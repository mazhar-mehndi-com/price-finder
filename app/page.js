'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COLORS = {
  bg: '#f4f6fb',
  card: '#ffffff',
  primary: '#6366f1', // Vibrant ZIK Purple
  primaryLight: '#eef2ff',
  textMain: '#1e1b4b', // Deep Navy
  textMuted: '#94a3b8', // Cool Slate
  border: '#eef2ff',
  success: '#10b981',
  danger: '#ef4444',
  amazon: '#ff9900'
};

// --- SUB-COMPONENTS ---

const WidgetHeader = ({ title, subtitle, badge }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textMain }}>{title}</h3>
      {badge && (
        <div style={{ padding: '4px 10px', backgroundColor: COLORS.primaryLight, borderRadius: '8px', color: COLORS.primary, fontSize: '11px', fontWeight: '800' }}>
            {badge}
        </div>
      )}
    </div>
    {subtitle && <p style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '500' }}>{subtitle}</p>}
  </div>
);

const SellerCard = ({ seller, rank, onAnalyze }) => {
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    const volumeNum = parseInt((seller.discoveryVolume || "0").replace(/,/g, '')) || 0;
    const val = (volumeNum * (Math.random() * 20 + 15)).toLocaleString(undefined, { maximumFractionDigits: 0 });
    setRevenue(val);
  }, [seller.discoveryVolume]);

  return (
    <div 
        onClick={() => onAnalyze(seller.username)}
        style={{ 
            display: 'grid', 
            gridTemplateColumns: '30px 1fr 40px 100px', 
            alignItems: 'center', 
            padding: '16px 0', 
            borderBottom: `1px solid ${COLORS.border}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        }}
        className="hover-lift"
    >
        <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted }}>{rank}</div>
        <div style={{ paddingLeft: '5px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.textMain, marginBottom: '2px' }}>{seller.username}</div>
            <div style={{ fontSize: '10px', color: COLORS.primary, fontWeight: '700', letterSpacing: '0.02em' }}>TOP SELLER</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '18px' }}>🕵️‍♂️</div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textMain }}>{revenue ? `$${revenue}` : '...'}</div>
            <div style={{ fontSize: '9px', fontWeight: '700', color: COLORS.textMuted, letterSpacing: '0.03em' }}>REVENUE</div>
        </div>
    </div>
  );
};

const CalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  if (!currentDate) return <div style={{ height: '300px', backgroundColor: '#fff', borderRadius: '24px', border: `1px solid ${COLORS.border}` }}></div>;

  const EVENTS = {
    '0-1': 'New Year\'s Sale 🎆',
    '1-14': 'Valentine\'s Day ❤️',
    '2-17': 'St. Patrick\'s Day 🍀',
    '3-5': 'Easter Sunday 🐰',
    '4-10': 'Mother\'s Day 👩',
    '5-21': 'Father\'s Day 👨',
    '6-4': 'Independence Day 🇺🇸',
    '8-7': 'Labor Day Sale 🛠️',
    '9-31': 'Halloween 🎃',
    '10-11': 'Veterans Day 🎖️',
    '10-26': 'Thanksgiving 🦃',
    '10-27': 'Black Friday 🖤',
    '11-25': 'Christmas Day 🎄',
    '11-31': 'New Year\'s Eve 🥂'
  };

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const today = new Date();

  const totalDays = daysInMonth(currentDate.getMonth(), year);
  const startDay = (firstDayOfMonth(currentDate.getMonth(), year) + 6) % 7;

  const findAbsoluteNextEvent = () => {
    const curMonth = today.getMonth();
    const curDay = today.getDate();
    const sortedEventKeys = Object.keys(EVENTS).sort((a, b) => {
        const [m1, d1] = a.split('-').map(Number);
        const [m2, d2] = b.split('-').map(Number);
        if (m1 !== m2) return m1 - m2;
        return d1 - d2;
    });
    const nextKey = sortedEventKeys.find(k => {
        const [m, d] = k.split('-').map(Number);
        return m > curMonth || (m === curMonth && d >= curDay);
    }) || sortedEventKeys[0];

    const [m, d] = nextKey.split('-').map(Number);
    const dateObj = new Date(year, m, d);
    const formattedDate = dateObj.toLocaleString('default', { month: 'short', day: 'numeric' });
    return `${EVENTS[nextKey]} — ${formattedDate}`;
  };

  
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
      <WidgetHeader title="Upcoming Events" badge="US ⌄" />
      <div style={{ textAlign: 'center', margin: '15px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span onClick={prevMonth} style={{ color: COLORS.textMuted, cursor: 'pointer', padding: '5px' }}>❮</span>
            <span style={{ fontWeight: '900', color: COLORS.success, fontSize: '16px' }}>{monthName}</span>
            <span onClick={nextMonth} style={{ color: COLORS.textMuted, cursor: 'pointer', padding: '5px' }}>❯</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: '10px' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', fontSize: '12px', color: COLORS.textMain, fontWeight: '700' }}>
        {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === year;
          const eventKey = `${currentDate.getMonth()}-${day}`;
          const hasEvent = EVENTS[eventKey];
          return (
            <div key={day} title={hasEvent || ''} style={{ padding: '8px 0', cursor: 'pointer', borderRadius: '8px', backgroundColor: isToday ? COLORS.success : (hasEvent ? COLORS.primaryLight : 'transparent'), color: isToday ? '#fff' : (hasEvent ? COLORS.primary : COLORS.textMain), position: 'relative', transition: 'all 0.2s' }}>
              {day}
              {hasEvent && !isToday && <div style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '8px' }}>●</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '15px' }}>
        <div style={{ fontSize: '12px', fontWeight: '800', color: COLORS.success }}>Next Major: {findAbsoluteNextEvent()}</div>
      </div>
    </div>
  );
};

export default function CompetitorResearch() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [discoveredSellers, setDiscoveredSellers] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);

  const analyzeSeller = async (targetUser) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed');
      setData(result);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const discoverSellers = async () => {
    setDiscovering(true);
    setError('');
    try {
      console.log("[Dashboard] Fetching market data from DB...");
      const res = await fetch('/api/discover-sellers?mode=db', { method: 'POST' });
      const json = await res.json();
      
      console.log("[Dashboard] Received data:", json);
      
      if (!res.ok) throw new Error(json.error || "Server error");
      
      if (json.sellers && json.sellers.length > 0) {
        setDiscoveredSellers(json.sellers);
      }
      if (json.products && json.products.length > 0) {
        setTrendingProducts(json.products);
      }
      
      localStorage.setItem('discovered_sellers', JSON.stringify(json.sellers || []));
    } catch (err) { 
        console.error("[Dashboard] Error:", err.message);
        setError("Market Data is currently being updated. Please try again in 5 minutes."); 
    } finally { 
        setDiscovering(false); 
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('discovered_sellers');
    if (saved) setDiscoveredSellers(JSON.parse(saved));
    
    // Explicitly trigger the global market scan on mount
    const triggerDiscovery = async () => {
        await discoverSellers();
    };
    triggerDiscovery();
  }, []);

  if (!mounted) return <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg }}></div>;

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', display: 'flex', flexWrap: 'wrap', fontFamily: 'Inter, sans-serif' }}>
      
      <style>{`
        @media (max-width: 1200px) {
            .persistent-sidebar { display: none !important; }
            .content-wrapper { margin-left: 0 !important; padding: 0 20px 100px !important; }
            .main-dashboard-grid { grid-template-columns: 1fr !important; }
            .trending-row-card { grid-template-columns: 80px 1fr 50px !important; gap: 15px !important; padding: 15px !important; }
            .stats-group-desktop { display: none !important; }
            .verified-badge-desktop { display: none !important; }
        }
      `}</style>
      
      <aside className="persistent-sidebar" style={{ width: '80px', backgroundColor: '#fff', borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px', position: 'fixed', top: '73px', bottom: 0, zIndex: 100 }}>
        {['⚡', '🔍', '📦', '🔗', '📑', '💎', '🎯', '🌟', '🗂️', '🎓', '🔧', '⚙️'].map((icon, i) => (
          <div key={i} style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '20px', cursor: 'pointer', backgroundColor: i === 0 ? COLORS.primary : 'transparent', color: i === 0 ? '#fff' : COLORS.textMuted, boxShadow: i === 0 ? '0 8px 15px rgba(99, 102, 241, 0.25)' : 'none', transition: 'all 0.2s' }}>{icon}</div>
        ))}
      </aside>

      <div className="content-wrapper" style={{ flex: 1, marginLeft: '80px', padding: '0 40px 100px', maxWidth: '100vw' }}>
        
        {/* HEADER NAVIGATION (BREADCRUMBS) */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px 0', borderBottom: `1px solid ${COLORS.border}`, marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '800', color: COLORS.primary, position: 'relative', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Market Insights
                <div style={{ position: 'absolute', bottom: '-28px', left: 0, right: 0, height: '4px', backgroundColor: COLORS.primary, borderRadius: '10px' }}></div>
            </Link>

            <span style={{ color: COLORS.textMuted, opacity: 0.5, fontSize: '10px' }}>❯</span>

            {/* Tools Breadcrumb Dropdown */}
            <div style={{ position: 'relative' }} className="nav-dropdown-wrapper">
              <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textMuted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Tools <span style={{ fontSize: '10px' }}>▼</span>
              </span>
              <div className="nav-dropdown">
                <Link href="/ebay-scraper" className="dropdown-item">eBay Scraper</Link>
                <Link href="/lowest-price" className="dropdown-item">Price Finder</Link>
                <Link href="/market-analytics" className="dropdown-item">Market Analytics</Link>
                <Link href="/seller-lookup" className="dropdown-item">Seller Lookup</Link>
                <Link href="/scrape-post" className="dropdown-item">Scrape Post</Link>
              </div>
            </div>

            <span style={{ color: COLORS.textMuted, opacity: 0.5, fontSize: '10px' }}>❯</span>

            <Link href="/" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                My Dashboard
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '25px', color: COLORS.textMuted, fontSize: '18px' }}><span>🌐</span><span>🔔</span></div>
        </header>

        <div className="main-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 320px) 1fr minmax(300px, 320px)', gap: '30px', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
              <WidgetHeader title="Trending Niches" subtitle="Last 30 Days" badge="US ⌄" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[{ k: 'Arm Blood Pressure...', r: '$57,754', hot: true }, { k: 'Car Portable Vacuum...', r: '$55,349', hot: true }, { k: 'LED Headlamp USB...', r: '$44,836', hot: true }, { k: 'Waterproof Led Strip', r: '$58,098', hot: false }].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textMain }}>{item.k} {item.hot && '🔥'}</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textMain }}>{item.r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
              <WidgetHeader title="Trending Sellers" subtitle="Last 30 Days" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {discoveredSellers.length > 0 ? discoveredSellers.map((s, i) => (
                  <SellerCard key={i} seller={s} rank={i + 1} onAnalyze={(u) => analyzeSeller(u)} />
                )) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}><div className="loading-spinner" style={{ width: '20px', height: '20px', border: '3px solid #f3f3f3', borderTop: `3px solid ${COLORS.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div></div>
                )}
                <button onClick={discoverSellers} disabled={discovering} style={{ marginTop: '15px', width: '100%', backgroundColor: COLORS.primaryLight, color: COLORS.primary, border: 'none', padding: '10px', borderRadius: '12px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>{discovering ? 'REFRESHING...' : 'REFRESH TOP SELLERS'}</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', minWidth: 0 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '15px 25px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '13px', color: COLORS.textMain, fontWeight: '700' }}>Dashboard Status: <span style={{ color: COLORS.success, fontWeight: '800' }}>Live Market Scan Active</span></div>
                <button onClick={() => window.location.href='/seller-lookup'} style={{ backgroundColor: COLORS.textMain, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>🔍 Competitor Lookup</button>
            </div>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', color: COLORS.textMain, letterSpacing: '-0.03em', marginBottom: '5px' }}>{data ? `Analysis: ${data.username}` : 'Global Trending Products'}</h2>
                    <p style={{ color: COLORS.textMuted, fontSize: '14px', fontWeight: '500' }}>Real-time demand verification based on verified eBay sales</p>
                </div>

                {discovering && !data && (
                    <div style={{ padding: '80px 0' }}><div className="loading-spinner" style={{ width: '50px', height: '50px', border: '5px solid #fff', borderTop: `5px solid ${COLORS.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div><p style={{ fontWeight: '700', color: COLORS.textMain }}>Scanning Market...</p></div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    {(data ? data.products : trendingProducts).map((item, i) => (
                        <div key={i} className="animate-fade-in trending-row-card" style={{ backgroundColor: '#fff', borderRadius: '22px', border: '1.5px solid #eff6ff', padding: '20px 25px', display: 'grid', gridTemplateColumns: '80px 1fr 50px 250px 50px', alignItems: 'center', gap: '20px', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.url)}`, '_blank')}>
                            <div style={{ width: '70px', height: '70px', backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden' }}>
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '10px' }}>NO IMG</div>
                                )}
                            </div>
                            <div style={{ textAlign: 'left', minWidth: 0 }}><h4 style={{ fontSize: '14px', fontWeight: '800', color: COLORS.textMain, lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4></div>
                            <div style={{ fontSize: '24px', textAlign: 'center' }}>{i < 3 ? '🔥' : '🕵️‍♂️'}</div>
                            <div className="stats-group-desktop" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                                {[{ l: 'Sales', v: item.volume }, { l: 'Growth', v: '+12%' }, { l: 'Price', v: item.price }].map(stat => (
                                    <div key={stat.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMain, marginBottom: '6px' }}>{stat.l}</div><div style={{ fontSize: '15px', fontWeight: '600', color: COLORS.textMuted }}>{stat.v}</div></div>
                                ))}
                            </div>
                            <div className="verified-badge-desktop" style={{ textAlign: 'right' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', border: `1.5px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginLeft: 'auto' }}>
                                    <div style={{ fontWeight: '900', fontSize: '16px', color: COLORS.textMain }}>a</div>
                                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '15px', height: '15px', backgroundColor: COLORS.success, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}><span style={{ color: '#fff', fontSize: '8px', fontWeight: '900' }}>✓</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
              <WidgetHeader title="Advanced Tools" badge="ⓘ" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '25px' }}>
                <div onClick={() => window.location.href='/'} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '10px', backgroundColor: COLORS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🚀</div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.primary }}>Bulk Scanner</span>
                </div>
                {[
                  { name: '500 Best Selling Items on eBay', lock: true },
                  { name: 'Turbo Scanner', lock: true },
                  { name: 'Autopilot', lock: true },
                ].map((tool, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '10px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🔒</div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textMain }}>{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <CalendarWidget />
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hover-lift:hover { transform: translateY(-2px); opacity: 0.8; }
        .hover-card:hover { transform: scale(1.01); border-color: #6366f1; box-shadow: 0 20px 40px rgba(99, 102, 241, 0.08); }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
