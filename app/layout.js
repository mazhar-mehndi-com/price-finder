import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'DealScout | Lowest Price Finder',
  description: 'Premium real-time price comparison across eBay, Amazon, and AliExpress',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body>
        <nav className="nav-container">
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
          <div className="nav-links">
            <Link href="/" className="nav-link">Market Insights</Link>
            
            {/* Tools Dropdown */}
            <div style={{ position: 'relative' }} className="nav-dropdown-wrapper">
              <span className="nav-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
