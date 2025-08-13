import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { Toaster } from 'react-hot-toast';
import ThemeToggle from './components/ThemeToggle';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import OAuthCallback from './pages/Auth/OAuthCallback';
import ProductDetail from './pages/ProductDetail';
import CreateProductPage from './pages/CreateProductPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import ChatInterface from './components/chat/ChatInterface';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/sell" element={<CreateProductPage />} />
              <Route path="/checkout/:orderId" element={<CheckoutPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/chat/:recipientId" element={<ChatInterface />} />
            </Routes>
          </main>
          <Footer />
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <Toaster position="top-center" reverseOrder={false} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
