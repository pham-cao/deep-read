import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import HistoryPage from './pages/HistoryPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login – no sidebar */}
        <Route path="/login" element={<LoginPage />} />

        {/* App shell with sidebar */}
        <Route element={<Layout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
