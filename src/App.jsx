import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import Appointments from './pages/Appointments';
import HealthLogs from './pages/HealthLogs';
import SOS from './pages/SOS';
import CaregiverOverview from './pages/CaregiverOverview';
import CaregiverSOS from './pages/CaregiverSOS';
import CaregiverMedications from './pages/CaregiverMedications';
import CaregiverHealthLogs from './pages/CaregiverHealthLogs';
import CaregiverLogin from './pages/CaregiverLogin';
import CaregiverRegister from './pages/CaregiverRegister';
import RoleProtectedRoute from './components/RoleProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/caregiver-login" element={<CaregiverLogin />} />
        <Route path="/caregiver-register" element={<CaregiverRegister />} />

        <Route
          path="/dashboard"
          element={(
            <RoleProtectedRoute requiredRole="elder">
              <Dashboard />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/medications"
          element={(
            <RoleProtectedRoute requiredRole="elder">
              <Medications />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/appointments"
          element={(
            <RoleProtectedRoute requiredRole="elder">
              <Appointments />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/health-logs"
          element={(
            <RoleProtectedRoute requiredRole="elder">
              <HealthLogs />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/sos"
          element={(
            <RoleProtectedRoute requiredRole="elder">
              <SOS />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/caregiver-dashboard"
          element={(
            <RoleProtectedRoute requiredRole="caregiver">
              <CaregiverOverview />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/caregiver-sos"
          element={(
            <RoleProtectedRoute requiredRole="caregiver">
              <CaregiverSOS />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/caregiver-medications"
          element={(
            <RoleProtectedRoute requiredRole="caregiver">
              <CaregiverMedications />
            </RoleProtectedRoute>
          )}
        />
        <Route
          path="/caregiver-health-logs"
          element={(
            <RoleProtectedRoute requiredRole="caregiver">
              <CaregiverHealthLogs />
            </RoleProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
