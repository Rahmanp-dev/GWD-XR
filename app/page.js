import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">✨ WebAR Menu Platform</div>
        <h1>
          See Your Food <span className="gradient-text">Before You Order</span>
        </h1>
        <p>
          Turn any restaurant menu into an immersive AR experience.
          Customers scan a QR code, point their phone at the table,
          and see 3D food models in real life. No app download.
        </p>
        <div className="hero-actions">
          <Link href="/r/demo-restaurant" className="btn btn-primary">
            🚀 Try Live Demo
          </Link>
          <Link href="/admin/login" className="btn btn-ghost">
            Restaurant Login →
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card card">
            <div className="step-number">1</div>
            <h3>Scan QR Code</h3>
            <p>Customer scans the QR code on the table. Opens instantly in the browser — no app needed.</p>
          </div>
          <div className="step-card card">
            <div className="step-number">2</div>
            <h3>Browse in 3D</h3>
            <p>View photorealistic 3D models of every dish. See the actual portion size on your real table.</p>
          </div>
          <div className="step-card card">
            <div className="step-number">3</div>
            <h3>Place & Inspect</h3>
            <p>Tap to place food on the table. Pinch to resize, drag to rotate. See every angle.</p>
          </div>
          <div className="step-card card">
            <div className="step-number">4</div>
            <h3>Order Directly</h3>
            <p>Add dishes to your cart and order right from the AR experience. Zero friction.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <h2 className="section-title">Why Restaurants Love It</h2>
        <div className="features-grid">
          <div className="card feature-card">
            <div className="feature-icon">📱</div>
            <h3>No App Required</h3>
            <p>Works directly in the browser. Supports iOS Safari, Chrome Android, and all modern mobile browsers.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">📈</div>
            <h3>Increase Order Value</h3>
            <p>Restaurants report 15-25% increase in average order value when customers can visualize dishes.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Setup</h3>
            <p>Upload your menu, get a QR code. We handle the 3D models, hosting, and analytics.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Privacy First</h3>
            <p>Camera feed never leaves the device. No images stored or transmitted. Full HTTPS.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-Time Analytics</h3>
            <p>Track which dishes get the most views, placements, and orders. Optimize your menu with data.</p>
          </div>
          <div className="card feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Your Brand</h3>
            <p>Custom colors, logo, and menu. Each restaurant gets its own branded AR experience.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to Transform Your Menu?</h2>
        <p>Join the restaurants already using AR to delight customers and boost revenue.</p>
        <Link href="/admin/login" className="btn btn-primary">
          Get Started Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} GWD XR. Built for the future of dining.</p>
      </footer>
    </div>
  );
}
