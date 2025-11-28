import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const InstituteDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newCourse, setNewCourse] = useState({ name: '', facultyId: '', description: '', requirements: '' });
  const [newAdmission, setNewAdmission] = useState({ title: '', description: '', deadline: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch faculties for this institution
    const facultiesQuery = query(collection(db, 'faculties'), where('institutionId', '==', currentUser.uid));
    const facultiesSnapshot = await getDocs(facultiesQuery);
    setFaculties(facultiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch courses for this institution
    const coursesQuery = query(collection(db, 'courses'), where('institutionId', '==', currentUser.uid));
    const coursesSnapshot = await getDocs(coursesQuery);
    setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch applications for courses of this institution
    const applicationsQuery = query(collection(db, 'applications'), where('institutionId', '==', currentUser.uid));
    const applicationsSnapshot = await getDocs(applicationsQuery);
    const applicationsWithProfiles = await Promise.all(
      applicationsSnapshot.docs.map(async (doc) => {
        const appData = { id: doc.id, ...doc.data() };
        // Fetch student profile
        const studentQuery = query(collection(db, 'users'), where('uid', '==', appData.studentId));
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
          appData.studentProfile = studentSnapshot.docs[0].data();
        }
        return appData;
      })
    );
    setApplications(applicationsWithProfiles);

    // Fetch admissions published by this institution
    const admissionsQuery = query(collection(db, 'admissions'), where('institutionId', '==', currentUser.uid));
    const admissionsSnapshot = await getDocs(admissionsQuery);
    setAdmissions(admissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'faculties'), {
      name: newFaculty,
      institutionId: currentUser.uid,
      createdAt: new Date(),
    });
    setNewFaculty('');
    fetchData();
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'courses'), {
      ...newCourse,
      institutionId: currentUser.uid,
      createdAt: new Date(),
    });
    setNewCourse({ name: '', facultyId: '', description: '', requirements: '' });
    fetchData();
  };

  const handlePublishAdmission = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'admissions'), {
      ...newAdmission,
      institutionId: currentUser.uid,
      published: true,
      publishedAt: new Date(),
    });
    setNewAdmission({ title: '', description: '', deadline: '' });
    fetchData();
  };

  const handleAdmissionDecision = async (applicationId, status) => {
    await updateDoc(doc(db, 'applications', applicationId), { status });
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
    <div className="institute-dashboard">
      <img src="/logo512.png" alt="Logo" style={{ width: '100px', height: '100px', display: 'block', margin: '0 auto 20px' }} />
      <div className="dashboard-header">
        <button onClick={() => window.history.back()}>Back</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <h2>Institute Dashboard</h2>

      <section>
        <h3>Publish New Admission</h3>
        <form onSubmit={handlePublishAdmission}>
          <input
            type="text"
            placeholder="Admission Title"
            value={newAdmission.title}
            onChange={(e) => setNewAdmission({ ...newAdmission, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={newAdmission.description}
            onChange={(e) => setNewAdmission({ ...newAdmission, description: e.target.value })}
          />
          <input
            type="date"
            placeholder="Deadline"
            value={newAdmission.deadline}
            onChange={(e) => setNewAdmission({ ...newAdmission, deadline: e.target.value })}
          />
          <button type="submit">Publish Admission</button>
        </form>
      </section>

      <section>
        <h3>Published Admissions</h3>
        <ul>
          {admissions.map(admission => (
            <li key={admission.id}>
              <strong>{admission.title}</strong> - Deadline: {admission.deadline}
              - Published: {admission.publishedAt.toDate().toLocaleDateString()}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Add Faculty</h3>
        <form onSubmit={handleAddFaculty}>
          <input
            type="text"
            placeholder="Faculty Name"
            value={newFaculty}
            onChange={(e) => setNewFaculty(e.target.value)}
            required
          />
          <button type="submit">Add Faculty</button>
        </form>
      </section>

      <section>
        <h3>Add Course</h3>
        <form onSubmit={handleAddCourse}>
          <input
            type="text"
            placeholder="Course Name"
            value={newCourse.name}
            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            required
          />
          <select
            value={newCourse.facultyId}
            onChange={(e) => setNewCourse({ ...newCourse, facultyId: e.target.value })}
            required
          >
            <option value="">Select Faculty</option>
            {faculties.map(faculty => (
              <option key={faculty.id} value={faculty.id}>{faculty.name}</option>
            ))}
          </select>
          <textarea
            placeholder="Description"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <textarea
            placeholder="Requirements"
            value={newCourse.requirements}
            onChange={(e) => setNewCourse({ ...newCourse, requirements: e.target.value })}
          />
          <button type="submit">Add Course</button>
        </form>
      </section>

      <section>
        <h3>Student Applications</h3>

        {/* Pending Applications */}
        <div style={{ marginBottom: '30px' }}>
          <h4>Pending Applications</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Course</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Applied Date</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.filter(app => app.status === 'pending').map(app => (
                <tr key={app.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.studentProfile ? `${app.studentProfile.firstName} ${app.studentProfile.lastName}` : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{app.courseName || 'Unknown Course'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.applicationDate ? new Date(app.applicationDate.seconds * 1000).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <button onClick={() => handleAdmissionDecision(app.id, 'admitted')} style={{ marginRight: '5px', backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>Admit</button>
                    <button onClick={() => handleAdmissionDecision(app.id, 'rejected')} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Admitted Students */}
        <div style={{ marginBottom: '30px' }}>
          <h4>Admitted Students</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Course</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Admitted Date</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {applications.filter(app => app.status === 'admitted').map(app => (
                <tr key={app.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.studentProfile ? `${app.studentProfile.firstName} ${app.studentProfile.lastName}` : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{app.courseName || 'Unknown Course'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.reviewDate ? new Date(app.reviewDate.seconds * 1000).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.studentProfile ? app.studentProfile.email : 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rejected Applications */}
        <div style={{ marginBottom: '30px' }}>
          <h4>Rejected Applications</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Student Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Course</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Rejected Date</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {applications.filter(app => app.status === 'rejected').map(app => (
                <tr key={app.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.studentProfile ? `${app.studentProfile.firstName} ${app.studentProfile.lastName}` : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{app.courseName || 'Unknown Course'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.reviewDate ? new Date(app.reviewDate.seconds * 1000).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {app.studentProfile ? app.studentProfile.email : 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default InstituteDashboard;
