import './globals.css';

export const metadata = {
  title: 'DealScout | Lowest Price Finder',
  description: 'Premium real-time price comparison across eBay, Amazon, and AliExpress',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(12px)',
          padding: '16px 40px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: 'var(--primary)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '800',
                fontSize: '18px'
            }}>D</div>
            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '20px', letterSpacing: '-0.5px' }}>DealScout</div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <a href="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: '500', fontSize: '14px', transition: 'color 0.2s' }}>eBay Scraper</a>
            <a href="/lowest-price" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: '500', fontSize: '14px' }}>Price Finder</a>
            <a href="/market-analytics" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '14px' }}>Market Analytics</a>
          </div>
          <div style={{ display: 'none' }}>
             {/* Spacing for balance on larger screens */}
          </div>
        </nav>
        <div style={{ minHeight: 'calc(100vh - 73px)' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
