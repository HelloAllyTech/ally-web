export default function Index() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1 className="heading-xl">
            Empowering Mental Health Care
            <br />
            with Intelligent Assistance
          </h1>
          <p className="lead">
            We're revolutionizing mental health support by combining human expertise 
            with AI capabilities, creating a more effective and accessible care system.
          </p>
          <a href="#features" className="btn">Discover How</a>
        </div>
      </section>

      <section id="features" className="feature-section">
        <div className="container">
          <div className="grid">
            <div className="card">
              <h3 className="heading-md text-gradient">Enhanced Listening</h3>
              <p>Advanced speech recognition technology that understands context and cultural nuances, 
              helping professionals capture every important detail in their sessions.</p>
            </div>
            <div className="card">
              <h3 className="heading-md text-gradient">Real-time Support</h3>
              <p>AI-powered assistance that provides relevant insights and suggestions while 
              preserving the essential human element of mental health care.</p>
            </div>
            <div className="card">
              <h3 className="heading-md text-gradient">Secure Infrastructure</h3>
              <p>Enterprise-grade security and privacy controls designed specifically for 
              mental health helplines and professionals.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div className="container">
          <h2 className="heading-lg">Comprehensive Tools</h2>
          <div className="grid">
            <div className="card">
              <h3 className="heading-md">Smart Documentation</h3>
              <p>Automated session summaries and analytics that help you focus more on your clients 
              and less on paperwork.</p>
            </div>
            <div className="card">
              <h3 className="heading-md">Professional Growth</h3>
              <p>Context-aware coaching and supervision tools that help you continuously improve 
              your practice.</p>
            </div>
            <div className="card">
              <h3 className="heading-md">Community Support</h3>
              <p>Connect with a growing network of mental health professionals to share knowledge 
              and best practices.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-section">
        <div className="container">
          <p className="quote">
            "The future of mental health care lies in the harmonious collaboration between 
            human empathy and artificial intelligence."
          </p>
          <p className="quote-author">— Our Vision for Mental Health Support</p>
        </div>
      </section>

      <section className="feature-section">
        <div className="container">
          <h2 className="heading-lg">Our Commitment</h2>
          <div className="grid">
            <div className="card">
              <h3 className="heading-md text-gradient">Open Source</h3>
              <p>Transparent and community-driven development ensuring continuous improvement 
              and accessibility.</p>
            </div>
            <div className="card">
              <h3 className="heading-md text-gradient">Not for Profit</h3>
              <p>Dedicated to creating social impact rather than financial gain, supported by 
              philanthropic venture capital.</p>
            </div>
            <div className="card">
              <h3 className="heading-md text-gradient">Always Free</h3>
              <p>Committed to keeping our tools free forever, making mental health support 
              more accessible to all.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <div className="container">
          <h2 className="heading-lg">Join Our Mission</h2>
          <p className="lead" style={{ color: 'white', opacity: 0.9 }}>
            Be part of the revolution in mental health support
          </p>
          <a href="mailto:lifeline@actgrants.in" className="contact-email">
            lifeline@actgrants.in
          </a>
        </div>
      </section>
    </main>
  );
}
