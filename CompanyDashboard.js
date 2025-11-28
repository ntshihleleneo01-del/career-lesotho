import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const CompanyDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [jobPostings, setJobPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    requirements: '',
    qualifications: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch job postings for this company
    const jobsQuery = query(collection(db, 'jobPostings'), where('companyId', '==', currentUser.uid));
    const jobsSnapshot = await getDocs(jobsQuery);
    setJobPostings(jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch applicants for company's jobs
    const applicantsQuery = query(collection(db, 'jobApplications'), where('companyId', '==', currentUser.uid));
    const applicantsSnapshot = await getDocs(applicantsQuery);
    const applicantsWithDetails = await Promise.all(
      applicantsSnapshot.docs.map(async (doc) => {
        const applicantData = { id: doc.id, ...doc.data() };
        // Fetch student profile details if needed
        return applicantData;
      })
    );
    setApplicants(applicantsWithDetails);
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'jobPostings'), {
      ...newJob,
      companyId: currentUser.uid,
      companyName: 'Company Name', // Should fetch from user profile
      createdAt: new Date(),
    });
    setNewJob({ title: '', description: '', requirements: '', qualifications: '' });
    fetchData();
  };

  const filterQualifiedApplicants = (jobId) => {
    // This is a simplified filtering logic
    // In a real app, you'd compare applicant profiles with job requirements
    return applicants.filter(app => app.jobId === jobId);
  };

  const handleAcceptApplicant = async (applicationId) => {
    await updateDoc(doc(db, 'jobApplications', applicationId), { status: 'accepted' });
    alert('Applicant accepted!');
    fetchData();
  };

  const handleRejectApplicant = async (applicationId) => {
    await updateDoc(doc(db, 'jobApplications', applicationId), { status: 'rejected' });
    alert('Applicant rejected!');
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="company-dashboard">
      <div className="dashboard-header">
        <button onClick={() => window.history.back()}>Back</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <h2>Company Dashboard</h2>

      <section>
        <h3>Post New Job</h3>
        <form onSubmit={handleAddJob}>
          <input
            type="text"
            placeholder="Job Title"
            value={newJob.title}
            onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Job Description"
            value={newJob.description}
            onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
            required
          />
          <textarea
            placeholder="Requirements"
            value={newJob.requirements}
            onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
          />
          <textarea
            placeholder="Qualifications"
            value={newJob.qualifications}
            onChange={(e) => setNewJob({ ...newJob, qualifications: e.target.value })}
          />
          <button type="submit">Post Job</button>
        </form>
      </section>

      <section>
        <h3>My Job Postings</h3>
        <ul>
          {jobPostings.map(job => (
            <li key={job.id}>
              <h4>{job.title}</h4>
              <p>{job.description}</p>
              <h5>Applicants:</h5>
              <ul>
                {applicants.filter(app => app.jobId === job.id).map(applicant => (
                  <li key={applicant.id}>
                    <strong>{applicant.studentName}</strong> - {applicant.studentEmail}
                    <br />
                    <strong>Qualifications:</strong> {applicant.studentQualifications}
                    <br />
                    <strong>Experience:</strong> {applicant.studentExperience}
                    <br />
                    <strong>Certificates:</strong> {applicant.studentCertificates}
                    <br />
                    <strong>Status:</strong> {applicant.status}
                    <br />
                    Applied: {applicant.appliedAt.toDate().toLocaleDateString()}
                    {applicant.status === 'pending' && (
                      <div>
                        <button onClick={() => handleAcceptApplicant(applicant.id)}>Accept</button>
                        <button onClick={() => handleRejectApplicant(applicant.id)}>Reject</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>All Job Applicants</h3>
        <p>Total applicants: {applicants.length}</p>
        <ul>
          {applicants.map(applicant => (
            <li key={applicant.id}>
              <strong>{applicant.studentName}</strong> - {applicant.studentEmail}
              <br />
              <strong>Job Applied:</strong> {applicant.jobTitle}
              <br />
              <strong>Qualifications:</strong> {applicant.studentQualifications}
              <br />
              <strong>Experience:</strong> {applicant.studentExperience}
              <br />
              <strong>Certificates:</strong> {applicant.studentCertificates}
              <br />
              <strong>Status:</strong> {applicant.status}
              <br />
              Applied: {applicant.appliedAt.toDate().toLocaleDateString()}
              {applicant.status === 'pending' && (
                <div>
                  <button onClick={() => handleAcceptApplicant(applicant.id)}>Accept</button>
                  <button onClick={() => handleRejectApplicant(applicant.id)}>Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default CompanyDashboard;
