import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import axios from 'axios';

const MyJobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://localhost:7051/api/JobPosts/mine', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJobs(response.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadJobs();
  }, []);

  const acceptApplication = async (jobId: number, applicationId: number) => {
  try {
    const token = localStorage.getItem('token');

    await axios.put(
      `https://localhost:7051/api/JobPosts/${jobId}/accept`,
      { applicationId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    alert('Application accepted!');

    const response = await axios.get(
      'https://localhost:7051/api/JobPosts/mine',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setJobs(response.data);
  } catch (error: any) {
    console.error('ACCEPT ERROR:', error);

    if (error.response) {
      alert(
        `Error ${error.response.status}: ` +
        JSON.stringify(error.response.data)
      );
    } else {
      alert('Network error: ' + error.message);
    }
  }
};

  return (
    <>
      <Navbar />

      <div style={{ padding: '2rem' }}>
        <h1>My Jobs</h1>

        {jobs.map(job => (
          <div
            key={job.id}
            style={{
              border: '1px solid #ccc',
              marginBottom: '20px',
              padding: '20px'
            }}
          >
            <h2>{job.title}</h2>

            <p>{job.description}</p>

            <h3>Applications</h3>

            {job.jobApplications?.length === 0 && (
              <p>No applications yet.</p>
            )}

            {job.jobApplications?.map((app: any) => (
              <div
                key={app.id}
                style={{
                  border: '1px solid #ddd',
                  padding: '10px',
                  marginBottom: '10px'
                }}
              >
                <p>
                  <strong>User:</strong> {app.user?.name}
                </p>

                <p>
                  <strong>Message:</strong> {app.message}
                </p>

                <button
                  onClick={() =>
                    acceptApplication(job.id, app.id)
                  }
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default MyJobs;