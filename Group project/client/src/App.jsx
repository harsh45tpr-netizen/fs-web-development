import React, { useState, useEffect, useMemo } from 'react';

// SVG Icons
const LogoWingIcon = () => (
  <svg className="brand-icon-svg" viewBox="0 0 24 24">
    <path d="M2.5 19.5c6.5-1 12.5-5.5 16-11.5-3.5 0-7 1.5-10 4-2 1.7-4 4.5-6 7.5zM21.5 4.5c-4 4-8.5 7-14 8.5 2-3 5-5.5 8.5-7 2-0.8 4-1.2 5.5-1.5z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, label: 'Connecting to Express...' });
  const [fleet, setFleet] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  // Booking Widget State
  const [bookingTab, setBookingTab] = useState('jets'); // 'jets' | 'yachts'
  const [bookingFrom, setBookingFrom] = useState('');
  const [bookingTo, setBookingTo] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingPassengers, setBookingPassengers] = useState(2);
  const [quoteEstimate, setQuoteEstimate] = useState(null);

  // Modals
  const [selectedCraft, setSelectedCraft] = useState(null);
  const [isEnquireModalOpen, setIsEnquireModalOpen] = useState(false);
  const [isInquiriesDrawerOpen, setIsInquiriesDrawerOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Enquire Form
  const [enquireForm, setEnquireForm] = useState({
    name: '',
    email: '',
    phone: '',
    craftType: 'jet',
    craftName: '',
    travelType: 'charter',
    departure: '',
    destination: '',
    date: '',
    passengers: 2,
    notes: ''
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch from Express + MongoDB REST API
  useEffect(() => {
    loadBackendData();
  }, []);

  const loadBackendData = async () => {
    // Health / DB status
    try {
      const hRes = await fetch('/api/health');
      const hJson = await hRes.json();
      setDbStatus({
        connected: hJson.database.includes('MongoDB'),
        label: hJson.database
      });
    } catch {
      setDbStatus({ connected: false, label: 'Backend Server Offline' });
    }

    // Fleet
    try {
      const fRes = await fetch('/api/fleet');
      const fJson = await fRes.json();
      setFleet(fJson.data || []);
    } catch {
      console.warn('Fleet API error');
    }

    // Destinations
    try {
      const dRes = await fetch('/api/destinations');
      const dJson = await dRes.json();
      setDestinations(dJson.data || []);
    } catch {
      console.warn('Destinations API error');
    }

    // Inquiries
    try {
      const iRes = await fetch('/api/inquiries');
      const iJson = await iRes.json();
      setInquiries(iJson.data || []);
    } catch {
      console.warn('Inquiries API error');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const featuredJets = useMemo(() => fleet.filter(c => c.type === 'jet'), [fleet]);
  const featuredYachts = useMemo(() => fleet.filter(c => c.type === 'yacht'), [fleet]);

  // Calculate instant charter quote
  const handleCalculateQuote = () => {
    if (!bookingTo) {
      showToast('Please select or type a destination first.');
      return;
    }

    const isJet = bookingTab === 'jets';
    const baseRate = isJet ? 11500 : 95000;
    const estHours = 3.5;
    const totalEstimate = isJet ? baseRate * estHours : baseRate;

    setQuoteEstimate({
      type: isJet ? 'Private Jet Charter' : 'Superyacht Charter',
      from: bookingFrom || 'Teterboro VIP Airport (KTEB)',
      to: bookingTo,
      date: bookingDate || 'Flexible Dates',
      passengers: bookingPassengers,
      estHours: isJet ? `${estHours} Flight Hours` : '7-Day Sea Itinerary',
      estPrice: `$${totalEstimate.toLocaleString()}`
    });

    setEnquireForm(prev => ({
      ...prev,
      craftType: isJet ? 'jet' : 'yacht',
      departure: bookingFrom || 'Teterboro VIP Airport (KTEB)',
      destination: bookingTo,
      date: bookingDate,
      passengers: bookingPassengers
    }));

    setIsEnquireModalOpen(true);
  };

  const handleSwapLocations = () => {
    const temp = bookingFrom;
    setBookingFrom(bookingTo);
    setBookingTo(temp);
  };

  const handleSelectDestination = (dest) => {
    setBookingTo(dest.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Destination selected: ${dest.name}. Calculating itinerary...`);
  };

  // Submit Enquiry to MongoDB
  const handleEnquireSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquireForm)
      });
      const json = await res.json();
      if (res.ok) {
        showToast('✨ Private Concierge request saved into MongoDB!');
        setIsEnquireModalOpen(false);
        loadBackendData();
      } else {
        showToast(json.message || 'Error submitting request');
      }
    } catch {
      showToast('Error connecting to Express server');
    }
  };

  // Delete from MongoDB
  const handleDeleteInquiry = async (id) => {
    try {
      await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
      setInquiries(inquiries.filter(i => i._id !== id));
      showToast('Inquiry removed from MongoDB');
    } catch {
      showToast('Error removing inquiry');
    }
  };

  // Reset database collection
  const handleResetDB = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json();
      showToast(json.message || 'Database reset to default!');
      loadBackendData();
    } catch {
      showToast('Error resetting database');
    }
  };

  return (
    <div className="app-root">
      {/* HEADER NAVIGATION */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <a href="#" className="brand-logo">
          <LogoWingIcon />
          <div className="brand-text">
            <h1>SKY & SEA</h1>
            <p>PRIVATE LUXURY • GLOBAL ACCESS</p>
          </div>
        </a>

        <ul className="nav-links">
          <li><a href="#hero" className="nav-link">Home</a></li>
          <li><a href="#jets" className="nav-link">Jets</a></li>
          <li><a href="#yachts" className="nav-link">Yachts</a></li>
          <li><a href="#destinations" className="nav-link">Destinations</a></li>
          <li><a href="#concierge" className="nav-link">Concierge</a></li>
        </ul>

        <div className="nav-actions">
          <div className="db-status-pill" title={dbStatus.label}>
            <span className="status-dot" style={{ background: dbStatus.connected ? '#10b981' : '#f59e0b', boxShadow: dbStatus.connected ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }}></span>
            <span>{dbStatus.connected ? 'MongoDB Live' : 'In-Mongo DB'}</span>
          </div>

          <button
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '99px', fontSize: '0.72rem', cursor: 'pointer' }}
            onClick={handleResetDB}
            title="Reset MongoDB Collection"
          >
            Reset DB
          </button>

          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-cream)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
            onClick={() => setIsInquiriesDrawerOpen(true)}
            title="View MongoDB Inquiries"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            {inquiries.length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: 'var(--gold-primary)', color: '#000', fontSize: '0.65rem', fontWeight: '800', width: '17px', height: '17px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {inquiries.length}
              </span>
            )}
          </button>

          <button className="btn-enquire" onClick={() => {
            setEnquireForm(prev => ({ ...prev, craftName: 'General Fleet Charter' }));
            setIsEnquireModalOpen(true);
          }}>
            Enquire Now
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" className="hero-section">
        <div className="hero-overlay"></div>

        <div className="scroll-indicator">
          <div className="scroll-line"></div>
          <span>SCROLL</span>
        </div>

        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span>★</span>
              <span>PRIVATE JETS • LUXURY YACHTS • EXCLUSIVE DESTINATIONS</span>
            </div>
            <h1 className="hero-headline">
              YOUR WORLD.<br />
              <em>Without Limits.</em>
            </h1>
            <p className="hero-description">
              Charter or own the world's most extraordinary private jets and yachts. Unmatched luxury. Global destinations. Personalized for you.
            </p>
          </div>

          {/* Floating Charter Booking Widget */}
          <div className="booking-widget-wrapper">
            <div className="booking-widget">
              <div className="widget-tabs">
                <button
                  className={`tab-btn ${bookingTab === 'jets' ? 'active' : ''}`}
                  onClick={() => setBookingTab('jets')}
                >
                  ✈️ Jets
                </button>
                <button
                  className={`tab-btn ${bookingTab === 'yachts' ? 'active' : ''}`}
                  onClick={() => setBookingTab('yachts')}
                >
                  ⚓ Yachts
                </button>
              </div>

              <div className="widget-fields">
                <div className="field-group">
                  <span className="field-label">From</span>
                  <input
                    type="text"
                    className="field-input"
                    placeholder={bookingTab === 'jets' ? "Teterboro, NY (KTEB)" : "Port Hercules, Monaco"}
                    value={bookingFrom}
                    onChange={(e) => setBookingFrom(e.target.value)}
                  />
                </div>

                <button className="swap-btn" onClick={handleSwapLocations} title="Swap Locations">
                  ⇄
                </button>

                <div className="field-group">
                  <span className="field-label">To</span>
                  <input
                    type="text"
                    className="field-input"
                    placeholder={bookingTab === 'jets' ? "Nice Côte d'Azur (LFMN)" : "Saint-Tropez & Corsica"}
                    value={bookingTo}
                    onChange={(e) => setBookingTo(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <span className="field-label">Date</span>
                  <input
                    type="date"
                    className="field-input"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <span className="field-label">Guests</span>
                  <select
                    className="field-input"
                    style={{ background: 'transparent', color: '#fff' }}
                    value={bookingPassengers}
                    onChange={(e) => setBookingPassengers(Number(e.target.value))}
                  >
                    {[1, 2, 4, 6, 8, 12, 16, 20, 36].map(n => (
                      <option key={n} value={n} style={{ background: '#0d121c' }}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                <button className="search-btn-gold" onClick={handleCalculateQuote} title="Search & Calculate Estimate">
                  <SearchIcon />
                </button>
              </div>
            </div>

            <div className="story-teaser">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-cream)', fontStyle: 'italic' }}>More than a journey. It's a lifestyle.</span>
              <button className="story-btn" onClick={() => setIsStoryModalOpen(true)}>
                <div className="play-circle">▶</div>
                <span>Watch Our Story</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED JETS SECTION */}
      <section id="jets">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">FEATURED JETS</div>
              <h2 className="section-title">Fly in <em>Absolute Luxury</em></h2>
              <p className="section-subtitle">
                From ultra-long range to iconic classics, our private jets offer unmatched comfort, privacy and performance.
              </p>
            </div>

            <button className="explore-link" onClick={() => {
              setEnquireForm(prev => ({ ...prev, craftType: 'jet', craftName: 'Ultra Long Range Fleet' }));
              setIsEnquireModalOpen(true);
            }}>
              <span>Explore All Jets</span>
              <ArrowRightIcon />
            </button>
          </div>

          <div className="craft-grid">
            {featuredJets.map(jet => (
              <div key={jet._id || jet.name} className="craft-card">
                <div>
                  <div className="craft-image-wrap">
                    <img src={jet.image} alt={jet.name} className="craft-img" />
                    <span className="craft-badge">{jet.badge}</span>
                  </div>

                  <div className="craft-body">
                    <div>
                      <h3 className="craft-name">{jet.name}</h3>
                      <div className="craft-specs-row">
                        <span>👥 {jet.passengers} Passengers</span>
                        <span>•</span>
                        <span>✈️ {jet.range.split(' ')[0]} nm</span>
                        <span>•</span>
                        <span>{jet.category}</span>
                      </div>
                    </div>

                    <div className="craft-footer">
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Charter From</div>
                        <div className="craft-price">
                          ${jet.priceCharter.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ hour</span>
                        </div>
                      </div>

                      <button className="btn-circle-arrow" onClick={() => setSelectedCraft(jet)}>
                        <ArrowRightIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED YACHTS SECTION */}
      <section id="yachts" style={{ background: 'linear-gradient(180deg, #07090e 0%, #0a0e16 100%)' }}>
        <div className="container">
          <div className="yacht-showcase-split">
            {/* Left Column: Illuminated Night Superyacht */}
            <div className="yacht-feature-hero">
              <div className="yacht-hero-content">
                <span className="yacht-hero-badge">🌟 Aurora • 110M Superyacht</span>
                <h3 className="yacht-hero-title">Bespoke Voyages Under Starlit Skies</h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-cream)', maxWidth: '480px', marginBottom: '24px', lineHeight: '1.6' }}>
                  Gliding with underwater neon illumination and private helicopter deck, experience the world's most secluded harbors in absolute sovereignty.
                </p>
                <button className="btn-enquire" onClick={() => {
                  setEnquireForm(prev => ({ ...prev, craftType: 'yacht', craftName: 'Aurora 110M Flagship' }));
                  setIsEnquireModalOpen(true);
                }}>
                  Charter This Vessel
                </button>
              </div>
            </div>

            {/* Right Column: Yacht Cards */}
            <div className="yachts-right-col">
              <div>
                <div className="section-eyebrow">FEATURED YACHTS</div>
                <h2 className="section-title">Sail Beyond <em>Ordinary</em></h2>
                <p className="section-subtitle" style={{ marginBottom: '24px' }}>
                  Experience the freedom of the open seas with our handpicked selection of the world's most luxurious yachts.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {featuredYachts.map(yacht => (
                  <div key={yacht._id || yacht.name} className="yacht-mini-card">
                    <img src={yacht.image} alt={yacht.name} className="yacht-mini-thumb" />
                    <div className="yacht-mini-info">
                      <div>
                        <h4 className="craft-name" style={{ fontSize: '1.15rem' }}>{yacht.name}</h4>
                        <div className="craft-specs-row" style={{ marginBottom: '10px' }}>
                          <span>📏 {yacht.length}</span>
                          <span>•</span>
                          <span>👥 {yacht.passengers} Guests</span>
                        </div>
                      </div>

                      <div className="craft-footer" style={{ paddingTop: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>From</div>
                          <div className="craft-price" style={{ fontSize: '1.05rem' }}>
                            ${yacht.priceCharter.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ week</span>
                          </div>
                        </div>
                        <button className="btn-circle-arrow" style={{ width: '36px', height: '36px' }} onClick={() => setSelectedCraft(yacht)}>
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXCLUSIVE DESTINATIONS */}
      <section id="destinations">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">EXCLUSIVE DESTINATIONS</div>
              <h2 className="section-title">Extraordinary Places. <em>Unforgettable Moments.</em></h2>
              <p className="section-subtitle">
                Direct tarmac-to-yacht transfers in the world's most prestigious luxury sanctuaries.
              </p>
            </div>
          </div>

          <div className="destinations-grid">
            {destinations.map(dest => (
              <div
                key={dest.name}
                className="destination-card"
                onClick={() => handleSelectDestination(dest)}
                title={`Click to select ${dest.name}`}
              >
                <img src={dest.image} alt={dest.name} className="destination-img" />
                <div className="destination-overlay">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{dest.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', fontStyle: 'italic' }}>{dest.tagline}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST PILLARS */}
      <div className="trust-bar" id="concierge">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon-box">🌐</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Global Availability</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Jets & yachts in 100+ countries</p>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">👑</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Personalized Concierge</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Tailored to your every need</p>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">🛡️</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Trusted & Secure</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Your privacy, our priority</p>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box">🎧</div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>24/7 Support</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>We're always here for you</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-overlay"></div>
        <div className="container">
          <div className="footer-inner">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.2em', marginBottom: '12px', color: '#fff' }}>SKY & SEA</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.8rem', color: 'var(--gold-light)', marginBottom: '32px' }}>
              Luxury in the Sky. Freedom on the Sea.
            </div>
            <button className="btn-footer-cta" onClick={() => {
              setEnquireForm(prev => ({ ...prev, craftName: 'Private Jet & Yacht Combo Expedition' }));
              setIsEnquireModalOpen(true);
            }}>
              Start Your Journey →
            </button>

            <div className="footer-bottom">
              <div>© 2026 SKY & SEA (Pro-2 Fullstack MERN)</div>
              <div>Privacy Policy • Terms of Charter • VIP Contact</div>
            </div>
          </div>
        </div>
      </footer>

      {/* CRAFT SPECIFICATIONS MODAL */}
      {selectedCraft && (
        <div className="modal-backdrop" onClick={() => setSelectedCraft(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCraft(null)}>&times;</button>
            <img src={selectedCraft.image} alt={selectedCraft.name} style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '14px', marginBottom: '20px' }} />

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff' }}>{selectedCraft.name}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--gold-light)', marginBottom: '20px' }}>{selectedCraft.manufacturer} • {selectedCraft.model}</div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-cream)', marginBottom: '20px', lineHeight: '1.6' }}>
              {selectedCraft.description}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Purchase Price</div>
                <div className="craft-price" style={{ fontSize: '1.4rem' }}>${selectedCraft.priceBuy.toLocaleString()}</div>
              </div>

              <button className="btn-enquire" onClick={() => {
                setEnquireForm(prev => ({ ...prev, craftType: selectedCraft.type, craftName: selectedCraft.name }));
                setSelectedCraft(null);
                setIsEnquireModalOpen(true);
              }}>
                Enquire for {selectedCraft.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENQUIRE MODAL */}
      {isEnquireModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEnquireModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsEnquireModalOpen(false)}>&times;</button>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Private Concierge Inquiry (MongoDB)
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gold-light)', marginBottom: '24px' }}>
              {enquireForm.craftName ? `Craft: ${enquireForm.craftName}` : 'Custom Charter'}
            </div>

            {quoteEstimate && (
              <div style={{ background: 'rgba(223, 186, 115, 0.1)', border: '1px solid var(--border-gold)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold-light)', textTransform: 'uppercase', fontWeight: '700' }}>Estimated Charter Quote</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', margin: '4px 0' }}>{quoteEstimate.estPrice}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {quoteEstimate.from} → {quoteEstimate.to} ({quoteEstimate.estHours})
                </div>
              </div>
            )}

            <form onSubmit={handleEnquireSubmit}>
              <label className="lux-label">Full Name *</label>
              <input
                type="text"
                required
                className="lux-input"
                placeholder="Lord / Lady / Mr. / Ms. Alexander Vance"
                value={enquireForm.name}
                onChange={e => setEnquireForm({ ...enquireForm, name: e.target.value })}
              />

              <label className="lux-label">Email Address *</label>
              <input
                type="email"
                required
                className="lux-input"
                placeholder="vance@monacofamilyoffice.mc"
                value={enquireForm.email}
                onChange={e => setEnquireForm({ ...enquireForm, email: e.target.value })}
              />

              <label className="lux-label">Departure</label>
              <input
                type="text"
                className="lux-input"
                placeholder="e.g. London Luton (EGGW)"
                value={enquireForm.departure}
                onChange={e => setEnquireForm({ ...enquireForm, departure: e.target.value })}
              />

              <label className="lux-label">Destination</label>
              <input
                type="text"
                className="lux-input"
                placeholder="e.g. Nice Côte d'Azur (LFMN)"
                value={enquireForm.destination}
                onChange={e => setEnquireForm({ ...enquireForm, destination: e.target.value })}
              />

              <label className="lux-label">Special Concierge Requests</label>
              <textarea
                rows="2"
                className="lux-input"
                placeholder="Helicopter transfer, champagne, dietary..."
                value={enquireForm.notes}
                onChange={e => setEnquireForm({ ...enquireForm, notes: e.target.value })}
              ></textarea>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn-enquire" onClick={() => setIsEnquireModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-footer-cta" style={{ padding: '10px 28px' }}>Submit to MongoDB</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INQUIRIES DRAWER (MONGODB LIVE VIEWER) */}
      {isInquiriesDrawerOpen && (
        <div className="modal-backdrop" onClick={() => setIsInquiriesDrawerOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsInquiriesDrawerOpen(false)}>&times;</button>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#fff' }}>Live Inquiries in MongoDB</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gold-light)', marginBottom: '20px' }}>Direct REST API records</div>

            {inquiries.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No inquiries registered yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto' }}>
                {inquiries.map(inq => (
                  <div key={inq._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{inq.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>{inq.status || 'Confirmed'}</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-cream)', marginBottom: '6px' }}>
                      📍 {inq.departure || 'Departure'} → {inq.destination || 'Destination'} ({inq.craftName || 'Fleet'})
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                      📧 {inq.email} | 👥 {inq.passengers || 2} Guests
                    </div>

                    {inq.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--gold-light)', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', fontStyle: 'italic' }}>
                        "{inq.notes}"
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                        onClick={() => handleDeleteInquiry(inq._id)}
                      >
                        Dismiss from MongoDB
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STORY MODAL */}
      {isStoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsStoryModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '860px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" style={{ zIndex: 10, background: 'rgba(0,0,0,0.6)' }} onClick={() => setIsStoryModalOpen(false)}>&times;</button>
            <div style={{ position: 'relative', height: '480px', background: '#000' }}>
              <img src="/images/hero.jpg" alt="Story cover" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px', background: 'radial-gradient(circle, rgba(0,0,0,0.4) 0%, rgba(7,9,14,0.95) 100%)' }}>
                <LogoWingIcon />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: '#fff', marginTop: '14px', marginBottom: '8px' }}>
                  The Symphony of Sky & Sea
                </h2>
                <p style={{ fontSize: '1rem', color: 'var(--gold-light)', maxWidth: '560px', fontStyle: 'italic', marginBottom: '24px' }}>
                  "Where transcontinental flight speed harmonizes with the timeless serenity of azure waters."
                </p>
                <button className="btn-footer-cta" onClick={() => {
                  setIsStoryModalOpen(false);
                  setIsEnquireModalOpen(true);
                }}>
                  Request Private Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMsg && (
        <div className="toast-lux">
          <span>💎</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
