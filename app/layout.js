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
    <html lang="en">
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
            <Link href="/" className="nav-link">eBay Scraper</Link>
            <Link href="/lowest-price" className="nav-link">Price Finder</Link>
            <Link href="/market-analytics" className="nav-link">Market Analytics</Link>
            <Link href="/competitor-research" className="nav-link">Competitor Research</Link>
            <Link href="/scrape-post" className="nav-link">Scrape Post</Link>
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
