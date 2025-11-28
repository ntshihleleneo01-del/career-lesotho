import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          localStorage.setItem('userRole', data.role);
          // Redirect to role-specific dashboard
          navigate(`/${data.role}`);
        }
      }
    };

    fetchUserData();
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem('userRole');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Career Guidance and Employment Integration Platform</h1>
        <button onClick={handleLogout}>Logout</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </header>
      <main>
        <h2>Welcome, {userData.name}!</h2>
        <p>Role: {userData.role}</p>
        <p>Redirecting to your dashboard...</p>
      </main>
    </div>
  );
};

export default Dashboard;
