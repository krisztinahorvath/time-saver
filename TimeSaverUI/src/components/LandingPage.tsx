import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import './LandingPage.css';
import type { JobCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';

const POPULAR_CATEGORIES: JobCategory[] = [
  'Cleaning', 'Repairs', 'Electrical', 'Plumbing', 'Moving',
  'Delivery', 'Tutoring', 'Gardening', 'PetCare', 'TechSupport',
  'Design', 'Events',
];

const STEPS = [
  {
    number: '1',
    icon: '📋',
    title: 'Postezi taskul',
    desc: 'Descrie ce ai nevoie și bugetul',
  },
  {
    number: '2',
    icon: '👤',
    title: 'Alegi prestatorul',
    desc: 'Primești aplicații de la prestatori verificați',
  },
  {
    number: '3',
    icon: '🔒',
    title: 'Plătești securizat',
    desc: 'Plata e reținută în escrow până la finalizare',
  },
  {
    number: '4',
    icon: '✅',
    title: 'Eliberezi plata',
    desc: 'Confirmi finalizarea și prestatorul primește banii',
  },
];

const TRUST_STATS = [
  { value: '500+', label: 'Joburi finalizate' },
  { value: '200+', label: 'Prestatori activi' },
  { value: '4.8★', label: 'Rating mediu' },
  { value: '24h',  label: 'Timp mediu de răspuns' },
];

const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Marketplace de servicii locale</div>
          <h1 className="hero-title">
            Găsește rapid oameni<br />
            pentru <span className="highlight">taskurile tale.</span>
          </h1>
          <p className="hero-subtitle">
            TimeSaver conectează angajatori și prestatori într-un marketplace sigur, cu plăți securizate și recenzii reale.
          </p>
          <div className="hero-actions">
            <Link to="/explore" className="btn btn-primary btn-hero">
              Explorează taskuri
            </Link>
            <Link to="/register" className="btn btn-outline btn-hero">
              Postează un task
            </Link>
          </div>
          <p className="hero-note">
            Ești prestator?{' '}
            <Link to="/register">Înregistrează-te gratuit</Link> și găsești primii clienți în câteva ore.
          </p>
        </div>

        <div className="hero-visual">
          <div className="hero-card-preview">
            <div className="preview-card">
              <span className="badge badge-open">Disponibil</span>
              <h3>Reparație instalație sanitară</h3>
              <p>Schimb robinet și garnituri baie — urgent</p>
              <div className="preview-footer">
                <strong>150 RON</strong>
                <span>📍 Cluj-Napoca</span>
              </div>
            </div>
            <div className="preview-card">
              <span className="badge badge-open">Disponibil</span>
              <h3>Meditații matematică cls. 10</h3>
              <p>Pregătire bacalaureat, 2h/săptămână</p>
              <div className="preview-footer">
                <strong>80 RON/oră</strong>
                <span>📍 Online</span>
              </div>
            </div>
            <div className="preview-card">
              <span className="badge badge-open">Disponibil</span>
              <h3>Curățenie apartament 3 camere</h3>
              <p>Curățenie generală, produse asigurate</p>
              <div className="preview-footer">
                <strong>200 RON</strong>
                <span>📍 București</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust stats ── */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-stats">
            {TRUST_STATS.map(s => (
              <div key={s.label} className="trust-stat">
                <div className="trust-num">{s.value}</div>
                <div className="trust-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-heading">Cum funcționează?</h2>
          <p className="section-subheading">Patru pași simpli pentru a rezolva orice task</p>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={s.number} className="step-card">
                <div className="step-number">{s.number}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < STEPS.length - 1 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular categories ── */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-heading">Categorii populare</h2>
          <p className="section-subheading">Navighează direct la joburile care te interesează</p>
          <div className="categories-grid">
            {POPULAR_CATEGORIES.map(cat => (
              <Link
                to={`/explore?category=${cat}`}
                key={cat}
                className="category-chip"
              >
                <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                <span>{CATEGORY_LABELS[cat]}</span>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/explore" className="btn btn-outline">
              Vezi toate categoriile →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-grid">
            <div className="benefit-col benefit-employer">
              <div className="benefit-icon">📋</div>
              <h2>Pentru angajatori</h2>
              <ul>
                <li>Postezi orice task <strong>gratuit</strong></li>
                <li>Primești oferte de la prestatori locali</li>
                <li>Tu alegi cine lucrează — nicio obligație</li>
                <li>Comunicare directă prin chat</li>
                <li>Review și rating după finalizare</li>
              </ul>
              <Link to="/register" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                Postează primul task
              </Link>
            </div>
            <div className="benefit-col benefit-worker">
              <div className="benefit-icon">🔧</div>
              <h2>Pentru prestatori</h2>
              <ul>
                <li>Găsești clienți <strong>în zona ta</strong></li>
                <li>Aplici la taskuri care te interesează</li>
                <li>Îți construiești un profil cu recenzii</li>
                <li>Câștiguri directe, fără comisioane ascunse</li>
                <li>Flex total — lucrezi când vrei</li>
              </ul>
              <Link to="/register" className="btn btn-outline" style={{ marginTop: '1.5rem' }}>
                Devino prestator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Plus Teaser ── */}
      <section className="plus-teaser">
        <div className="container">
          <div className="plus-teaser-inner">
            <div className="plus-teaser-content">
              <div className="plus-teaser-badge">TimeSaver Plus</div>
              <h2 className="plus-teaser-title">Accesează joburi exclusive cu TimeSaver Plus</h2>
              <p className="plus-teaser-desc">Obține acces prioritar la cele mai bune taskuri, vizibilitate sporită și filtre avansate de căutare.</p>
              <div className="plus-teaser-features">
                <span className="plus-teaser-feature">Joburi Plus exclusive</span>
                <span className="plus-teaser-feature">Badge verificat</span>
                <span className="plus-teaser-feature">Suport prioritar</span>
                <span className="plus-teaser-feature">Filtre avansate</span>
              </div>
            </div>
            <Link to="/plus" className="btn btn-plus">
              Descoperă Plus
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Gata să începi?</h2>
            <p>Înregistrarea este gratuită și durează mai puțin de 2 minute.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-cta-primary">
                Creează cont gratuit
              </Link>
              <Link to="/explore" className="btn btn-cta-outline">
                Explorează joburi
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>© 2026 TimeSaver — Platformă de servicii locale</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
