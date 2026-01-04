import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import styles from './Landing.module.css';

export default function Landing() {
  const { token } = useAuth();

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <img src="/yalavoch-logo.png" alt="Yalavoch" className={styles.logoImg} />
            <span className={styles.logoText}>Yalavoch</span>
          </Link>
          
          <nav className={styles.nav}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#pricing">Pricing</a>
            <Link to="/docs">API Docs</Link>
          </nav>
          
          <div className={styles.headerActions}>
            {token ? (
              <Link to="/dashboard" className={styles.btnPrimary}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.btnSecondary}>
                  Log In
                </Link>
                <Link to="/register" className={styles.btnPrimary}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gridPattern} />
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Secure Telegram-Based OTP
          </div>
          
          <h1 className={styles.heroTitle}>
            Phone Verification <br />
            <span className={styles.highlight}>Without SMS Costs</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            Send OTP codes via Telegram for free. Integrate in minutes with our simple API. 
            Perfect for startups and enterprises who want reliable, cost-effective verification.
          </p>
          
          <div className={styles.heroActions}>
            <Link to="/register" className={styles.btnHero}>
              Start Free Trial
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/docs" className={styles.btnOutline}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              View Documentation
            </Link>
          </div>
          
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>0 UZS</span>
              <span className={styles.statLabel}>per OTP</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>99.9%</span>
              <span className={styles.statLabel}>Delivery Rate</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>~1s</span>
              <span className={styles.statLabel}>Delivery Time</span>
            </div>
          </div>
        </div>
        
        {/* Code Preview */}
        <div className={styles.codePreview}>
          <div className={styles.codeHeader}>
            <div className={styles.codeDots}>
              <span />
              <span />
              <span />
            </div>
            <span className={styles.codeTitle}>Integration Example</span>
          </div>
          <pre className={styles.codeContent}>
            <code>{`// Send OTP
const response = await fetch('https://api.yalavoch.uz/otp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    phoneNumber: '+998901234567'
  })
});

const { requestId } = await response.json();

// Verify OTP
const verify = await fetch('https://api.yalavoch.uz/otp/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    requestId,
    code: userEnteredCode
  })
});`}</code>
          </pre>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>Why Choose Yalavoch?</h2>
          <p className={styles.sectionSubtitle}>
            Enterprise-grade security with startup-friendly pricing
          </p>
          
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h3>Instant Delivery</h3>
              <p>OTP codes arrive in under 1 second via Telegram's reliable infrastructure.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Secure by Design</h3>
              <p>End-to-end encryption with Telegram. No SMS interception risks.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3>Zero SMS Costs</h3>
              <p>Save up to 95% compared to traditional SMS verification services.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3>Easy Integration</h3>
              <p>Simple REST API. Get started in under 5 minutes with our documentation.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3>High Success Rate</h3>
              <p>99.9% delivery rate with real-time status tracking and webhooks.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3>For Everyone</h3>
              <p>Individual and business accounts with flexible pricing tiers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionContent}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Three simple steps to verify your users
          </p>
          
          <div className={styles.stepsGrid}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Request OTP</h3>
                <p>Call our API with the user's phone number. We create a secure verification request.</p>
              </div>
            </div>
            
            <div className={styles.stepConnector}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>User Gets Code</h3>
                <p>User receives a 6-digit OTP instantly via our Telegram bot. Fast and reliable.</p>
              </div>
            </div>
            
            <div className={styles.stepConnector}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Verify Code</h3>
                <p>Verify the code through our API. Get instant confirmation of successful verification.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2>Ready to Get Started?</h2>
          <p>Join hundreds of businesses using Yalavoch for secure, cost-effective phone verification.</p>
          <div className={styles.ctaActions}>
            <Link to="/register" className={styles.btnHero}>
              Create Free Account
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <div className={styles.logo}>
              <img src="/yalavoch-logo.png" alt="Yalavoch" className={styles.logoImg} />
              <span className={styles.logoText}>Yalavoch</span>
            </div>
            <p>Secure phone verification via Telegram. Fast, reliable, cost-effective.</p>
          </div>
          
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/docs">API Docs</Link>
            </div>
            <div className={styles.footerColumn}>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Contact</a>
              <a href="#">Terms of Service</a>
            </div>
            <div className={styles.footerColumn}>
              <h4>Connect</h4>
              <a href="#">Telegram</a>
              <a href="#">GitHub</a>
              <a href="#">Twitter</a>
            </div>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p>© 2025 Yalavoch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

