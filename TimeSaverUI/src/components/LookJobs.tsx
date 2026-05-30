import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import './Jobs.css';

interface JobPostImage {
  id: number;
  imageUrl: string;
  jobPostId: number;
}

interface JobApplication {
  id: number;
  message: string;
  jobApplicationStatus: number;
  createdAt: string;
  jobPostId: number;
  userId?: number;
}

interface JobPost {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: number;
  createdAt: string;
  userId: number;
  images: JobPostImage[];
  jobApplications: JobApplication[];
}

const LookJobs: React.FC = () => {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('1'); // Defaults to string '1' (Open)
  const [applicationMessages, setApplicationMessages] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://localhost:7001/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJobs(response.data);
      } catch (error) {
        console.error("Failed to fetch job posts:", error);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || job.status === parseInt(selectedStatus);
    return matchesSearch && matchesStatus;
  });

  const handleApplySubmit = async (jobId: number): Promise<void> => {
    const messageText = applicationMessages[jobId] || '';
    if (!messageText.trim()) {
      alert("Please enter a short cover letter message.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://localhost:7001/api/jobs/${jobId}/apply`, 
        { message: messageText }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Application sent successfully!');
      setApplicationMessages(prev => ({ ...prev, [jobId]: '' })); 
    } catch (error) {
      console.error(error);
      alert('Could not submit application.');
    }
  };

  const getStatusLabel = (statusNum: number): string => {
    if (statusNum === 0) return 'Pending';
    if (statusNum === 1) return 'Open';
    if (statusNum === 2) return 'In Progress';
    if (statusNum === 3) return 'Completed';
    return 'Unknown';
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrap">
        <header className="page-header">
          <h1>Available Tasks</h1>
          <p>Browse listings matching your criteria.</p>
        </header>

        <div className="search-filter-bar">
          <input 
            type="text" 
            placeholder="Search keyword..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Statuses</option>
            <option value="0">Pending</option>
            <option value="1">Open</option>
            <option value="2">In Progress</option>
            <option value="3">Completed</option>
          </select>
        </div>

        <div className="jobs-list">
          {filteredJobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <div>
                  <h2>{job.title}</h2>
                  <span className="job-budget">${job.budget.toFixed(2)}</span>
                </div>
                <span className={`badge status-${job.status}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>
              <p className="job-description">{job.description}</p>

              {job.images && job.images.length > 0 && (
                <div className="job-images-gallery">
                  {job.images.map(img => (
                    <img key={img.id} src={img.imageUrl} alt="Job reference" className="job-thumb" />
                  ))}
                </div>
              )}

              <div className="apply-box">
                <textarea 
                  placeholder="Write a message to apply..."
                  value={applicationMessages[job.id] || ''}
                  onChange={(e) => setApplicationMessages(prev => ({ ...prev, [job.id]: e.target.value }))}
                  rows={2}
                />
                <button className="apply-btn" onClick={() => handleApplySubmit(job.id)}>
                  Submit Application
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LookJobs;