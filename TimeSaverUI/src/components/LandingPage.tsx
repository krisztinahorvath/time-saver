import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import './LandingPage.css';

const CATEGORIES = [
  { icon: '🧹', label: 'Curățenie' },
  { icon: '🔧', label: 'Reparații' },
  { icon: '💡', label: 'Electricitate' },
  { icon: '🚰', label: 'Instalații' },
  { icon: '🚚', label: 'Mutări' },
  { icon: '📚', label: 'Meditații' },
  { icon: '🌿', label: 'Grădinărit' },
  { icon: '🐾', label: 'Pet Care' },
  { icon: '💻', label: 'IT & Tech' },
  { icon: '🎨', label: 'Design' },
  { icon: '🛋️', label: 'Montaj mobilier' },
  { icon: '🎉', label: 'Evenimente' },
];

const STEPS = [
  {
    number: '1',
    title: 'Postează un task',
    desc: 'Descrie ce ai nevoie, stabilește bugetul și locația.',
  },
  {
    number: '2',
    title: 'Primești aplicații',
    desc: 'Prestatorii locali aplică și îți trimit oferte personalizate.',
  },
  {
    number: '3',
    title: 'Alege și finalizează',
    desc: 'Selectezi prestatorul potrivit, lucrezi și lași un review.',
  },
];

const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Găsește rapid <span className="highlight">servicii locale</span> sau<br />
            postează un task și primești oferte
          </h1>
          <p className="hero-subtitle">
            Conectăm angajatorii cu prestatori de servicii verificați din zona ta.
            Rapid, simplu și sigur.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-hero">
              Postează un task
            </Link>
            <Link to="/explore" className="btn btn-outline btn-hero">
              Găsește joburi
            </Link>
          </div>
          <p className="hero-note">
            Ești prestator?{' '}
            <Link to="/register">Înregistrează-te gratuit</Link> și începe să câștigii
          </p>
        </div>

        <div className="hero-visual">
          <div className="hero-card-preview">
            <div className="preview-card">
              <span className="badge badge-open">Disponibil</span>
              <h3>Reparație instalație sanitară</h3>
              <p>Schimb robinet și garnituri baie</p>
              <div className="preview-footer">
                <strong>150 RON</strong>
                <span>Cluj-Napoca</span>
              </div>
            </div>
            <div className="preview-card">
              <span className="badge badge-open">Disponibil</span>
              <h3>Meditații matematică cls. 10</h3>
              <p>Pregătire bacalaureat, 2 ore/săpt</p>
              <div className="preview-footer">
                <strong>80 RON/oră</strong>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-heading">Cum funcționează?</h2>
          <p className="section-subheading">Trei pași simpli pentru a rezolva orice task</p>
          <div className="steps-grid">
            {STEPS.map((s) => (
              <div key={s.number} className="step-card">
                <div className="step-number">{s.number}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-heading">Categorii populare</h2>
          <div className="categories-grid">
            {CATEGORIES.map((c) => (
              <Link to="/explore" key={c.label} className="category-chip">
                <span className="category-icon">{c.icon}</span>
                <span>{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-grid">
            <div className="benefit-col">
              <h2>Pentru angajatori</h2>
              <ul>
                <li>✅ Postezi gratuit orice task</li>
                <li>✅ Primești oferte de la prestatori locali</li>
                <li>✅ Tu alegi cine lucrează</li>
                <li>✅ Review și rating după finalizare</li>
              </ul>
              <Link to="/register" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                Postează primul task
              </Link>
            </div>
            <div className="benefit-col">
              <h2>Pentru prestatori</h2>
              <ul>
                <li>✅ Găsești clienți în zona ta</li>
                <li>✅ Aplici la taskuri care te interesează</li>
                <li>✅ Îți construiești un profil cu recenzii</li>
                <li>✅ Câștiguri directe, fără intermediari</li>
              </ul>
              <Link to="/register" className="btn btn-outline" style={{ marginTop: '1.5rem' }}>
                Devino prestator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <h2>Gata să începi?</h2>
          <p>Înregistrarea este gratuită și durează mai puțin de 2 minute.</p>
          <Link to="/register" className="btn btn-primary btn-hero">
            Creează cont gratuit
          </Link>
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
