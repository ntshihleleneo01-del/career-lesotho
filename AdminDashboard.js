import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admissions, setAdmissions] = useState([]);

  // Form states
  const [newInstitution, setNewInstitution] = useState({ name: '', description: '', location: '' });
  const [newFaculty, setNewFaculty] = useState({ name: '', institutionId: '' });
  const [newCourse, setNewCourse] = useState({ name: '', facultyId: '', description: '', requirements: '' });
  const [newAdmission, setNewAdmission] = useState({ title: '', description: '', deadline: '', institutionId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch institutions
    const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
    setInstitutions(institutionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch companies
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    setCompanies(companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch faculties
    const facultiesSnapshot = await getDocs(collection(db, 'faculties'));
    setFaculties(facultiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch courses
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch applications
    const applicationsSnapshot = await getDocs(collection(db, 'applications'));
    setApplications(applicationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch admissions
    const admissionsSnapshot = await getDocs(collection(db, 'admissions'));
    setAdmissions(admissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Institution management
  const handleAddInstitution = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'institutions'), {
      ...newInstitution,
      approved: true,
      createdAt: new Date(),
    });
    setNewInstitution({ name: '', description: '', location: '' });
    fetchData();
  };

  const handleUpdateInstitution = async (id, updatedData) => {
    await updateDoc(doc(db, 'institutions', id), updatedData);
    fetchData();
  };

  const handleDeleteInstitution = async (id) => {
    if (window.confirm('Are you sure you want to delete this institution?')) {
      await deleteDoc(doc(db, 'institutions', id));
      fetchData();
    }
  };

  const handleApproveInstitution = async (id) => {
    await updateDoc(doc(db, 'institutions', id), { approved: true });
    fetchData();
  };

  // Faculty management
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'faculties'), {
      ...newFaculty,
      createdAt: new Date(),
    });
    setNewFaculty({ name: '', institutionId: '' });
    fetchData();
  };

  const handleUpdateFaculty = async (id, updatedData) => {
    await updateDoc(doc(db, 'faculties', id), updatedData);
    fetchData();
  };

  const handleDeleteFaculty = async (id) => {
    if (window.confirm('Are you sure you want to delete this faculty?')) {
      await deleteDoc(doc(db, 'faculties', id));
      fetchData();
    }
  };

  // Course management
  const handleAddCourse = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'courses'), {
      ...newCourse,
      institutionId: faculties.find(f => f.id === newCourse.facultyId)?.institutionId,
      createdAt: new Date(),
    });
    setNewCourse({ name: '', facultyId: '', description: '', requirements: '' });
    fetchData();
  };

  const handleUpdateCourse = async (id, updatedData) => {
    await updateDoc(doc(db, 'courses', id), updatedData);
    fetchData();
  };

  const handleDeleteCourse = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      await deleteDoc(doc(db, 'courses', id));
      fetchData();
    }
  };

  // Company management
  const handleApproveCompany = async (id) => {
    await updateDoc(doc(db, 'companies', id), { approved: true });
    fetchData();
  };

  const handleSuspendCompany = async (id) => {
    await updateDoc(doc(db, 'companies', id), { suspended: true });
    fetchData();
  };

  const handleDeleteCompany = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      await deleteDoc(doc(db, 'companies', id));
      fetchData();
    }
  };

  // Admission management
  const handlePublishAdmission = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'admissions'), {
      ...newAdmission,
      published: true,
      publishedAt: new Date(),
    });
    setNewAdmission({ title: '', description: '', deadline: '', institutionId: '' });
    fetchData();
  };

  const handleUpdateAdmission = async (id, updatedData) => {
    await updateDoc(doc(db, 'admissions', id), updatedData);
    fetchData();
  };

  const handleDeleteAdmission = async (id) => {
    if (window.confirm('Are you sure you want to delete this admission?')) {
      await deleteDoc(doc(db, 'admissions', id));
      fetchData();
    }
  };

  // Create institution records for users with institute role who don't have records
  const createMissingInstitutionRecords = async () => {
    const instituteUsers = users.filter(u => u.role === 'institute');
    for (const user of instituteUsers) {
      const institutionExists = institutions.find(inst => inst.id === user.uid);
      if (!institutionExists) {
        try {
          await setDoc(doc(db, 'institutions', user.uid), {
            name: user.institutionName || 'Institution',
            description: '',
            location: '',
            approved: true,
            createdBy: user.uid,
            createdAt: new Date(),
          });
          console.log('Created institution record for user:', user.uid);
        } catch (error) {
          console.error('Error creating institution record:', error);
        }
      }
    }
    fetchData();
  };

  // Create company records for users with company role who don't have records
  const createMissingCompanyRecords = async () => {
    const companyUsers = users.filter(u => u.role === 'company');
    for (const user of companyUsers) {
      const companyExists = companies.find(comp => comp.id === user.uid);
      if (!companyExists) {
        try {
          await setDoc(doc(db, 'companies', user.uid), {
            name: user.companyName || 'Company',
            description: '',
            location: '',
            approved: true,
            createdBy: user.uid,
            createdAt: new Date(),
          });
          console.log('Created company record for user:', user.uid);
        } catch (error) {
          console.error('Error creating company record:', error);
        }
      }
    }
    fetchData();
  };

  return (
    <div className="admin-dashboard">
      <img src="/logo512.png" alt="Logo" style={{ width: '100px', height: '100px', display: 'block', margin: '0 auto 20px' }} />
      <div className="dashboard-header">
        <button onClick={() => window.history.back()}>Back</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <h2>Admin Dashboard</h2>

      {/* User Management */}
      <section>
        <h3>Users by Role</h3>

        <h4>Admins ({users.filter(u => u.role === 'admin').length})</h4>
        <ul>
          {users.filter(u => u.role === 'admin').map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> - {user.email}
              - Verified: {user.verified ? 'Yes' : 'No'}
              - Created: {user.createdAt?.toDate().toLocaleDateString()}
            </li>
          ))}
        </ul>

        <h4>Institutions ({users.filter(u => u.role === 'institute').length})</h4>
        <ul>
          {users.filter(u => u.role === 'institute').map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> - {user.email}
              {user.institutionName && <span> - Institution: {user.institutionName}</span>}
              - Verified: {user.verified ? 'Yes' : 'No'}
              - Created: {user.createdAt?.toDate().toLocaleDateString()}
            </li>
          ))}
        </ul>

        <h4>Companies ({users.filter(u => u.role === 'company').length})</h4>
        <ul>
          {users.filter(u => u.role === 'company').map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> - {user.email}
              {user.companyName && <span> - Company: {user.companyName}</span>}
              - Verified: {user.verified ? 'Yes' : 'No'}
              - Created: {user.createdAt?.toDate().toLocaleDateString()}
            </li>
          ))}
        </ul>

        <h4>Students ({users.filter(u => u.role === 'student').length})</h4>
        <ul>
          {users.filter(u => u.role === 'student').map(user => (
            <li key={user.id}>
              <strong>{user.name}</strong> - {user.email}
              - Verified: {user.verified ? 'Yes' : 'No'}
              - Created: {user.createdAt?.toDate().toLocaleDateString()}
            </li>
          ))}
        </ul>
      </section>

      {/* Institution Management */}
      <section>
        <h3>Add New Institution</h3>
        <form onSubmit={handleAddInstitution}>
          <input
            type="text"
            placeholder="Institution Name"
            value={newInstitution.name}
            onChange={(e) => setNewInstitution({ ...newInstitution, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newInstitution.description}
            onChange={(e) => setNewInstitution({ ...newInstitution, description: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            value={newInstitution.location}
            onChange={(e) => setNewInstitution({ ...newInstitution, location: e.target.value })}
          />
          <button type="submit">Add Institution</button>
        </form>
      </section>

      <section>
        <h3>Institutions</h3>
        <ul>
          {institutions.map(inst => (
            <li key={inst.id}>
              <strong>{inst.name}</strong> - {inst.location} - {inst.approved ? 'Approved' : 'Pending'}
              {!inst.approved && (
                <button onClick={() => handleApproveInstitution(inst.id)}>Approve</button>
              )}
              <button onClick={() => handleUpdateInstitution(inst.id, { name: prompt('New name:', inst.name) || inst.name })}>
                Update
              </button>
              <button onClick={() => handleDeleteInstitution(inst.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Faculty Management */}
      <section>
        <h3>Add New Faculty</h3>
        <form onSubmit={handleAddFaculty}>
          <input
            type="text"
            placeholder="Faculty Name"
            value={newFaculty.name}
            onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
            required
          />
          <select
            value={newFaculty.institutionId}
            onChange={(e) => setNewFaculty({ ...newFaculty, institutionId: e.target.value })}
            required
          >
            <option value="">Select Institution</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <button type="submit">Add Faculty</button>
        </form>
      </section>

      <section>
        <h3>Faculties</h3>
        <ul>
          {faculties.map(faculty => (
            <li key={faculty.id}>
              <strong>{faculty.name}</strong> - Institution: {institutions.find(i => i.id === faculty.institutionId)?.name}
              <button onClick={() => handleUpdateFaculty(faculty.id, { name: prompt('New name:', faculty.name) || faculty.name })}>
                Update
              </button>
              <button onClick={() => handleDeleteFaculty(faculty.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Course Management */}
      <section>
      <h3>Add New Course</h3>
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
        <h3>Courses</h3>
        <ul>
          {courses.map(course => (
            <li key={course.id}>
              <strong>{course.name}</strong> - Faculty: {faculties.find(f => f.id === course.facultyId)?.name}
              <button onClick={() => handleUpdateCourse(course.id, { name: prompt('New name:', course.name) || course.name })}>
                Update
              </button>
              <button onClick={() => handleDeleteCourse(course.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Company Management */}
      <section>
        <h3>Companies</h3>
        <ul>
          {companies.map(comp => (
            <li key={comp.id}>
              <strong>{comp.name}</strong> - {comp.approved ? 'Approved' : 'Pending'} {comp.suspended && '(Suspended)'}
              {!comp.approved && (
                <button onClick={() => handleApproveCompany(comp.id)}>Approve</button>
              )}
              <button onClick={() => handleSuspendCompany(comp.id)}>Suspend</button>
              <button onClick={() => handleDeleteCompany(comp.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Admission Management */}
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
          <select
            value={newAdmission.institutionId}
            onChange={(e) => setNewAdmission({ ...newAdmission, institutionId: e.target.value })}
            required
          >
            <option value="">Select Institution</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <button type="submit">Publish Admission</button>
        </form>
      </section>

      <section>
        <h3>Published Admissions</h3>
        <ul>
          {admissions.map(admission => (
            <li key={admission.id}>
              <strong>{admission.title}</strong> - Institution: {institutions.find(i => i.id === admission.institutionId)?.name}
              - Deadline: {admission.deadline}
              <button onClick={() => handleUpdateAdmission(admission.id, { title: prompt('New title:', admission.title) || admission.title })}>
                Update
              </button>
              <button onClick={() => handleDeleteAdmission(admission.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/* System Reports */}
      <section>
        <h3>System Reports</h3>
        <p>Total Users: {users.length}</p>
        <p>Total Institutions: {users.filter(u => u.role === 'institute').length}</p>
        <p>Total Companies: {users.filter(u => u.role === 'company').length}</p>
        <p>Total Courses: {courses.length}</p>
        <p>Total Applications: {applications.length}</p>
        <p>Total Admissions: {admissions.length}</p>

        {/* Debug Information */}
        <h4>Debug Information:</h4>
        <p>Users by Role:</p>
        <ul>
          <li>Admins: {users.filter(u => u.role === 'admin').length}</li>
          <li>Institutions: {users.filter(u => u.role === 'institute').length}</li>
          <li>Students: {users.filter(u => u.role === 'student').length}</li>
          <li>Companies: {users.filter(u => u.role === 'company').length}</li>
        </ul>
        <p>Institution Records: {institutions.length}</p>
        <p>Company Records: {companies.length}</p>

        {/* Fix Missing Records */}
        <h4>Fix Missing Records</h4>
        <button onClick={createMissingInstitutionRecords}>Create Missing Institution Records</button>
        <button onClick={createMissingCompanyRecords}>Create Missing Company Records</button>
      </section>
    </div>
  );
};

export default AdminDashboard;
