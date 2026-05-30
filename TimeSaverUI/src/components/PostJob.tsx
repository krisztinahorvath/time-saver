import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import api from '../api/axiosConfig';
import './Jobs.css';

interface JobPostFormState {
  title: string;
  description: string;
  budget: string;
}

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<JobPostFormState>({
    title: '',
    description: '',
    budget: ''
  });
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setUploadedImages(prev => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    const rawPayload = {
      title: form.title,
      description: form.description,
      budget: parseFloat(form.budget) || 0.0,
      status: 1, 
      images: uploadedImages.map(url => ({ imageUrl: url })),
      jobApplications: []
    };

    try {
      const token = localStorage.getItem('token');
      await api.post('/JobApplications', rawPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Job listed perfectly inside the SQL system!');
      navigate('/look-jobs');
    } catch (error) {
      console.error(error);
      alert('Failed to submit job payload structure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrap standard-flex-center">
        <div className="form-card">
          <h2>Post a Task</h2>
          <form onSubmit={handleSubmit} className="job-form">
            
            <div className="input-group">
              <label>Task Title</label>
              <input 
                type="text" 
                required 
                value={form.title} 
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
                placeholder="e.g. Upgrade legacy API system" 
              />
            </div>

            <div className="input-group">
              <label>Budget Allocation (RON)</label>
              <input 
                type="number" 
                step="1" 
                required 
                value={form.budget} 
                onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))} 
                placeholder="0.00" 
              />
            </div>

            <div className="input-group">
              <label>Requirements Description</label>
              <textarea 
                required 
                rows={4} 
                value={form.description} 
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
                placeholder="Detail task expectations..." 
              />
            </div>

            <div className="input-group">
              <label>Image References (Optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={imageUrlInput} 
                  onChange={(e) => setImageUrlInput(e.target.value)} 
                  placeholder="Paste image URL..." 
                />
                <button type="button" onClick={handleAddImageUrl} className="apply-btn" style={{ padding: '0.5rem' }}>
                  Add
                </button>
              </div>
              {uploadedImages.length > 0 && (
                <ul style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.5rem' }}>
                  {uploadedImages.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              )}
            </div>

            <button type="submit" className="submit-job-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Syncing...' : 'Save and Open Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostJob;