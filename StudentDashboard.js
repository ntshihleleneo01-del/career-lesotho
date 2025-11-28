import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobPostings, setJobPostings] = useState([]);
  const [profile, setProfile] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all courses
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch user's applications
    const applicationsQuery = query(collection(db, 'applications'), where('studentId', '==', currentUser.uid));
    const applicationsSnapshot = await getDocs(applicationsQuery);
    setApplications(applicationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch job postings
    const jobPostingsSnapshot = await getDocs(collection(db, 'jobPostings'));
    setJobPostings(jobPostingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch user profile
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', currentUser.uid)));
    if (!userDoc.empty) {
      setProfile(userDoc.docs[0].data());
    }
  };

  const handleApplyForCourse = async (courseId, institutionId) => {
    // Check if student already applied for 5 courses from this institution
    const institutionApplications = applications.filter(app => app.institutionId === institutionId);
    if (institutionApplications.length >= 5) {
      alert('You can only apply for a maximum of 5 courses per institution.');
      return;
    }

    // Check if course requires qualifications (simplified check)
    const course = courses.find(c => c.id === courseId);
    if (course.requirements && !profile.qualifications) {
      alert('You do not meet the qualifications for this course.');
      return;
    }

    await addDoc(collection(db, 'applications'), {
      studentId: currentUser.uid,
      studentName: profile.name,
      courseId,
      courseName: course.name,
      institutionId,
      status: 'pending',
      appliedAt: new Date(),
    });
    fetchData();
  };

  const handleApplyForJob = async (jobId) => {
    const job = jobPostings.find(j => j.id === jobId);
    await addDoc(collection(db, 'jobApplications'), {
      studentId: currentUser.uid,
      studentName: profile.name,
      studentEmail: profile.email,
      studentPhone: profile.phone,
      studentQualifications: profile.qualifications,
      studentExperience: profile.experience,
      studentCertificates: profile.certificates,
      jobId,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      status: 'pending',
      appliedAt: new Date(),
    });
    alert('Application submitted successfully!');
  };

  const handleUpdateProfile = async (updatedProfile) => {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', currentUser.uid)));
    if (!userDoc.empty) {
      await updateDoc(doc(db, 'users', userDoc.docs[0].id), updatedProfile);
      setProfile({ ...profile, ...updatedProfile });
      alert('Profile updated successfully!');
    }
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
    <div className="student-dashboard">
      <img src="/logo512.png" alt="Logo" style={{ width: '100px', height: '100px', display: 'block', margin: '0 auto 20px' }} />
      <div className="dashboard-header">
        <button onClick={() => window.history.back()}>Back</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <h2>Student Dashboard</h2>

      <section>
        <h3>Available Courses</h3>
        <ul>
          {courses.map(course => (
            <li key={course.id}>
              {course.name} - {course.description}
              <button onClick={() => handleApplyForCourse(course.id, course.institutionId)}>Apply</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>My Applications</h3>
        <ul>
          {applications.map(app => (
            <li key={app.id}>
              {app.courseName} - Status: {app.status}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Job Opportunities</h3>
        <ul>
          {jobPostings.map(job => (
            <li key={job.id}>
              {job.title} at {job.companyName} - {job.description}
              <button onClick={() => handleApplyForJob(job.id)}>Apply</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Profile</h3>
        <div className="profile-display">
          <h4>Current Profile Information:</h4>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Phone:</strong> {profile.phone}</p>
          <p><strong>Address:</strong> {profile.address}</p>
          <p><strong>Qualifications:</strong> {profile.qualifications}</p>
          <p><strong>Experience:</strong> {profile.experience}</p>
          <p><strong>Certificates:</strong> {profile.certificates}</p>
        </div>
        <h4>Update Profile:</h4>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateProfile({
            name: e.target.name.value,
            email: e.target.email.value,
            phone: e.target.phone.value,
            address: e.target.address.value,
            qualifications: e.target.qualifications.value,
            experience: e.target.experience.value,
            certificates: e.target.certificates.value,
          });
        }}>
          <input name="name" placeholder="Full Name" defaultValue={profile.name} required />
          <input name="email" placeholder="Email" defaultValue={profile.email} required />
          <input name="phone" placeholder="Phone Number" defaultValue={profile.phone} />
          <textarea name="address" placeholder="Address" defaultValue={profile.address} />
          <textarea name="qualifications" placeholder="Academic Qualifications" defaultValue={profile.qualifications} />
          <textarea name="experience" placeholder="Work Experience" defaultValue={profile.experience} />
          <textarea name="certificates" placeholder="Additional Certificates" defaultValue={profile.certificates} />
          <button type="submit">Update Profile</button>
        </form>
      </section>
    </div>
  );
};

export default StudentDashboard;
