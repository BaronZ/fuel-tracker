import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import AddRefuel from '@/pages/AddRefuel';
import RefuelList from '@/pages/RefuelList';
import Stats from '@/pages/Stats';
import Vehicles from '@/pages/Vehicles';
import Settings from '@/pages/Settings';

function App() {
  return (
    <BrowserRouter basename="/fuel-tracker">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/refuel/add" element={<AddRefuel />} />
          <Route path="/refuel/list" element={<RefuelList />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Navigate to="/refuel/add" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
