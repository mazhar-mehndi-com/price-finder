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

const WidgetHeader = ({ title, subtitle, icon, badge }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon && <i className={`fa-solid ${icon}`} style={{ color: COLORS.primary, fontSize: '16px' }}></i>}
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textMain, margin: 0 }}>{title}</h3>
      </div>
      {badge && (
        <div style={{ padding: '4px 10px', backgroundColor: COLORS.primaryLight, borderRadius: '8px', color: COLORS.primary, fontSize: '10px', fontWeight: '800' }}>
            {badge}
        </div>
      )}
    </div>
    {subtitle && <p style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '500', margin: 0 }}>{subtitle}</p>}
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
        <div style={{ paddingLeft: '5px', minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.textMain, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seller.username}</div>
            <div style={{ fontSize: '9px', color: COLORS.primary, fontWeight: '800', letterSpacing: '0.05em' }}>VERIFIED</div>
        </div>
        <div style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-bolt" style={{ color: '#fbbf24' }}></i>
        </div>
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
    '0-1': 'New Year\'s Sale 🎆', '1-14': 'Valentine\'s Day ❤️', '2-17': 'St. Patrick\'s Day 🍀',
    '3-5': 'Easter Sunday 🐰', '4-10': 'Mother\'s Day 👩', '5-21': 'Father\'s Day 👨',
    '6-4': 'Independence Day 🇺🇸', '8-7': 'Labor Day Sale 🛠️', '9-31': 'Halloween 🎃',
    '10-11': 'Veterans Day 🎖️', '10-26': 'Thanksgiving 🦃', '10-27': 'Black Friday 🖤',
    '11-25': 'Christmas Day 🎄', '11-31': 'New Year\'s Eve 🥂'
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
      <WidgetHeader title="Upcoming Events" icon="fa-calendar-days" badge="US ⌄" />
      <div style={{ textAlign: 'center', margin: '15px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span onClick={prevMonth} style={{ color: COLORS.textMuted, cursor: 'pointer', padding: '5px' }}><i className="fa-solid fa-chevron-left"></i></span>
            <span style={{ fontWeight: '900', color: COLORS.success, fontSize: '16px' }}>{monthName}</span>
            <span onClick={nextMonth} style={{ color: COLORS.textMuted, cursor: 'pointer', padding: '5px' }}><i className="fa-solid fa-chevron-right"></i></span>
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
              {hasEvent && !isToday && <div style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '6px', color: COLORS.primary }}><i className="fa-solid fa-circle"></i></div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '15px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.success }}>
           <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px' }}></i> Next: {findAbsoluteNextEvent()}
        </div>
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
      const res = await fetch('/api/discover-sellers?mode=db', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server error");
      setDiscoveredSellers(json.sellers || []);
      setTrendingProducts(json.products || []);
      localStorage.setItem('discovered_sellers', JSON.stringify(json.sellers || []));
    } catch (err) { setError("Market Update in progress..."); } finally { setDiscovering(false); }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('discovered_sellers');
    if (saved) setDiscoveredSellers(JSON.parse(saved));
    discoverSellers();
  }, []);

  if (!mounted) return <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg }}></div>;

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', display: 'flex', width: '100%', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      <style>{`
        .main-dashboard-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 25px;
            width: 100%;
        }

        @media (min-width: 1300px) {
            .main-dashboard-grid {
                grid-template-columns: 260px 1fr 260px;
            }
        }

        .trending-row-card {
            display: grid;
            grid-template-columns: 60px 1fr 40px;
            gap: 15px;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
            padding: 15px 20px;
            background-color: #fff;
            border-radius: 20px;
            border: 1.5px solid #eff6ff;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (min-width: 1000px) {
            .trending-row-card {
                grid-template-columns: 70px 1fr 50px 200px 50px;
                gap: 20px;
            }
        }

        .loading-spinner { width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid ${COLORS.primary}; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hover-lift:hover { transform: translateY(-2px); opacity: 0.8; }
        .trending-row-card:hover { transform: scale(1.015); border-color: ${COLORS.primary}; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.1); z-index: 10; position: relative; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @media (max-width: 1100px) {
            .persistent-sidebar { display: none !important; }
        }
      `}</style>
      
      {/* --- SIDEBAR --- */}
      <aside className="persistent-sidebar" style={{ width: '70px', backgroundColor: '#fff', borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px', flexShrink: 0 }}>
        {['fa-gauge-high', 'fa-magnifying-glass', 'fa-box-open', 'fa-link', 'fa-file-lines', 'fa-gem', 'fa-bullseye', 'fa-star', 'fa-folder-tree', 'fa-user-graduate', 'fa-screwdriver-wrench', 'fa-gear'].map((icon, i) => (
          <div key={i} style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontSize: '16px', cursor: 'pointer', backgroundColor: i === 0 ? COLORS.primary : 'transparent', color: i === 0 ? '#fff' : COLORS.textMuted, boxShadow: i === 0 ? '0 8px 15px rgba(99, 102, 241, 0.25)' : 'none', transition: 'all 0.2s' }}>
            <i className={`fa-solid ${icon}`}></i>
          </div>
        ))}
      </aside>

      {/* --- CONTENT --- */}
      <div className="content-wrapper" style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
        
        {/* SAFE INNER CONTAINER */}
        <div style={{ padding: '0 25px 100px', maxWidth: '100%', boxSizing: 'border-box' }}>
        
            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: `1px solid ${COLORS.border}`, marginBottom: '40px', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', minWidth: 0 }}>
                <Link href="/" style={{ textDecoration: 'none', fontSize: '13px', fontWeight: '800', color: COLORS.primary, position: 'relative', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                    Market Insights
                    <div style={{ position: 'absolute', bottom: '-23px', left: 0, right: 0, height: '4px', backgroundColor: COLORS.primary, borderRadius: '10px' }}></div>
                </Link>
                <span style={{ color: COLORS.textMuted, opacity: 0.5, fontSize: '10px' }}><i className="fa-solid fa-chevron-right"></i></span>
                <div style={{ position: 'relative' }} className="nav-dropdown-wrapper">
                  <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textMuted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    Tools <i className="fa-solid fa-caret-down" style={{ fontSize: '10px' }}></i>
                  </span>
                  <div className="nav-dropdown">
                    <Link href="/ebay-scraper" className="dropdown-item"><i className="fa-solid fa-rocket" style={{ width: '20px' }}></i> Scraper</Link>
                    <Link href="/lowest-price" className="dropdown-item"><i className="fa-solid fa-tag" style={{ width: '20px' }}></i> Price Finder</Link>
                    <Link href="/market-analytics" className="dropdown-item"><i className="fa-solid fa-chart-line" style={{ width: '20px' }}></i> Analytics</Link>
                    <Link href="/seller-lookup" className="dropdown-item"><i className="fa-solid fa-user-secret" style={{ width: '20px' }}></i> Seller Lookup</Link>
                  </div>
                </div>
                <span style={{ color: COLORS.textMuted, opacity: 0.5, fontSize: '10px' }}><i className="fa-solid fa-chevron-right"></i></span>
                <Link href="/" style={{ textDecoration: 'none', fontSize: '13px', fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Dashboard</Link>
              </div>
              <div style={{ display: 'flex', gap: '20px', color: COLORS.textMuted, fontSize: '16px' }}>
                <i className="fa-solid fa-earth-americas" style={{ cursor: 'pointer' }}></i>
                <i className="fa-solid fa-bell" style={{ cursor: 'pointer' }}></i>
              </div>
            </header>

            {/* GRID */}
            <div className="main-dashboard-grid">
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', minWidth: 0 }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
                  <WidgetHeader title="Trending Niches" subtitle="Global Demand" icon="fa-chart-pie" badge="US ⌄" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {[{ k: 'Smart Watches', r: '$157k' }, { k: 'Home Decor', r: '$125k' }, { k: 'Fitness Gear', r: '$94k' }, { k: 'Pet Supplies', r: '$88k' }].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>{item.k} <i className="fa-solid fa-fire" style={{ color: COLORS.danger, fontSize: '9px' }}></i></span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textMain }}>{item.r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
                  <WidgetHeader title="Trending Sellers" subtitle="Best Performer" icon="fa-users-viewfinder" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {discoveredSellers.length > 0 ? discoveredSellers.map((s, i) => (
                      <SellerCard key={i} seller={s} rank={i + 1} onAnalyze={(u) => analyzeSeller(u)} />
                    )) : (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}><div className="loading-spinner"></div></div>
                    )}
                    <button onClick={discoverSellers} disabled={discovering} style={{ marginTop: '15px', width: '100%', backgroundColor: COLORS.primaryLight, color: COLORS.primary, border: 'none', padding: '10px', borderRadius: '12px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>
                       {discovering ? 'REFRESHING...' : 'REFRESH LIST'}
                    </button>
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', minWidth: 0 }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '12px 20px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: COLORS.textMain, fontWeight: '700' }}><i className="fa-solid fa-shield-check" style={{ color: COLORS.success, marginRight: '8px' }}></i> Market Live</div>
                    <button onClick={() => window.location.href='/seller-lookup'} style={{ backgroundColor: COLORS.textMain, color: '#fff', border: 'none', padding: '6px 15px', borderRadius: '10px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}><i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }}></i> Lookup</button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '25px' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: '900', color: COLORS.textMain, letterSpacing: '-0.03em', marginBottom: '4px' }}>{data ? data.username : 'Trending Products'}</h2>
                        <p style={{ color: COLORS.textMuted, fontSize: '13px', fontWeight: '500' }}>Verified eBay demand scan</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                        {(data ? data.products : trendingProducts).map((item, i) => (
                            <div key={i} className="animate-fade-in trending-row-card" onClick={() => window.open(`/scrape-post?url=${encodeURIComponent(item.url)}`, '_blank')}>
                                <div style={{ width: '60px', height: '60px', backgroundColor: '#f8fafc', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                    {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '9px' }}>NO IMG</div>}
                                </div>
                                <div style={{ textAlign: 'left', minWidth: 0 }}><h4 style={{ fontSize: '13px', fontWeight: '800', color: COLORS.textMain, lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4></div>
                                <div style={{ fontSize: '20px', textAlign: 'center' }}>{i < 3 ? <i className="fa-solid fa-fire" style={{ color: COLORS.danger }}></i> : <i className="fa-solid fa-circle-check" style={{ color: COLORS.success, opacity: 0.5, fontSize: '14px' }}></i>}</div>
                                <div className="stats-group-desktop" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px' }}>
                                    {[{ l: 'Sales', v: item.volume }, { l: 'Price', v: item.price }].map(stat => (
                                        <div key={stat.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMain, marginBottom: '4px' }}>{stat.l}</div><div style={{ fontSize: '14px', fontWeight: '600', color: COLORS.textMuted }}>{stat.v}</div></div>
                                    ))}
                                </div>
                                <div className="verified-badge-desktop" style={{ textAlign: 'right' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', border: `1.5px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginLeft: 'auto' }}>
                                        <div style={{ fontWeight: '900', fontSize: '14px', color: COLORS.textMain }}>a</div>
                                        <div style={{ position: 'absolute', top: '-3px', right: '-4px', width: '13px', height: '13px', backgroundColor: COLORS.success, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}><i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '7px' }}></i></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', minWidth: 0 }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: `1px solid ${COLORS.border}` }}>
                  <WidgetHeader title="Advanced Tools" icon="fa-screwdriver-wrench" badge="ⓘ" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div onClick={() => window.location.href='/ebay-scraper'} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}><div style={{ width: '24px', height: '24px', borderRadius: '8px', backgroundColor: COLORS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}><i className="fa-solid fa-rocket" style={{ color: COLORS.primary }}></i></div><span style={{ fontSize: '12px', fontWeight: '800', color: COLORS.primary }}>Bulk Scanner</span></div>
                    {['500 Best Selling', 'Turbo Scanner', 'Autopilot'].map((tool, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '24px', height: '24px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}><i className="fa-solid fa-lock" style={{ opacity: 0.2 }}></i></div><span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textMain }}>{tool}</span></div>
                    ))}
                  </div>
                </div>
                <CalendarWidget />
              </div>

            </div>
        </div>
      </div>
    </div>
  );
}
