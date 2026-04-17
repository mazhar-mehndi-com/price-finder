export const metadata = {
  title: 'eBay Bulk Upload Generator',
  description: 'Scrape eBay listings and generate bulk upload Excel files',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: 0, backgroundColor: '#f4f4f9' }}>
        <nav style={{ 
          backgroundColor: '#fff', 
          padding: '15px 30px', 
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)', 
          display: 'flex', 
          gap: '20px',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#0064d2', fontSize: '20px', marginRight: '20px' }}>eBayTools</div>
          <a href="/" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>eBay Scraper</a>
          <a href="/lowest-price" style={{ textDecoration: 'none', color: '#333', fontWeight: '500' }}>Lowest Price Finder</a>
        </nav>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
