import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import './ContactModal.css';

interface SharedJob {
  id: number;
  title: string;
  status: string;
}

interface Props {
  profileId: number;
  profileName: string;
  profileUserType: string;
  isEmployer: boolean;
  isWorker: boolean;
  phoneNumber?: string | null;
  onClose: () => void;
}

const STATUS_RO: Record<string, string> = {
  InProgress: 'În desfășurare',
  Completed:  'Finalizat',
};

const ContactModal: React.FC<Props> = ({
  profileId,
  profileName,
  profileUserType,
  isEmployer,
  isWorker,
  phoneNumber,
  onClose,
}) => {
  const navigate = useNavigate();
  const [jobs,    setJobs]    = useState<SharedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SharedJob[]>(`/Users/${profileId}/shared-jobs`)
      .then(res => setJobs(res.data))
      .catch(() => { /* non-critical */ })
      .finally(() => setLoading(false));
  }, [profileId]);

  const goToJob = (id: number) => {
    navigate(`/jobs/${id}`);
    onClose();
  };

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-box" onClick={e => e.stopPropagation()}>
        <button className="cm-close" onClick={onClose} aria-label="Închide">✕</button>

        <h2 className="cm-title">Contactează {profileName}</h2>

        {/* ── Shared jobs (job-based messaging) ── */}
        {loading ? (
          <p className="cm-sub">Se verifică joburile comune...</p>
        ) : jobs.length > 0 ? (
          <>
            <p className="cm-sub">Puteți comunica prin pagina jobului comun:</p>
            <div className="cm-jobs-list">
              {jobs.map(j => (
                <button
                  key={j.id}
                  className="cm-job-btn"
                  onClick={() => goToJob(j.id)}
                >
                  <span className="cm-job-title">💬 {j.title}</span>
                  <span className="cm-job-status">{STATUS_RO[j.status] ?? j.status}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="cm-sub">
              Nu există joburi comune active cu {profileName}.
              Mesageria TimeSaver funcționează prin joburi partajate.
            </p>
            <div className="cm-cta-list">
              {isEmployer && profileUserType === 'Worker' && (
                <button
                  className="btn btn-primary cm-cta-btn"
                  onClick={() => { navigate('/post-job'); onClose(); }}
                >
                  💼 Postează un job nou
                </button>
              )}
              {isWorker && profileUserType === 'Employer' && (
                <button
                  className="btn btn-outline cm-cta-btn"
                  onClick={() => { navigate(`/users/${profileId}/profile`); onClose(); }}
                >
                  🔍 Vezi joburile active ale lui {profileName}
                </button>
              )}
              <button
                className="btn btn-outline cm-cta-btn"
                onClick={() => { navigate('/explore'); onClose(); }}
              >
                Explorează toate joburile
              </button>
            </div>
          </>
        )}

        <hr className="cm-divider" />

        {/* ── Phone number ── */}
        {phoneNumber ? (
          <div className="cm-phone-section">
            <div className="cm-phone-label">📞 Număr de telefon</div>
            <div className="cm-phone-value">{phoneNumber}</div>
          </div>
        ) : (
          <div className="cm-no-phone">
            Acest utilizator nu a adăugat încă un număr de telefon.
          </div>
        )}

        <div className="cm-footer">
          <button className="btn btn-ghost" onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
