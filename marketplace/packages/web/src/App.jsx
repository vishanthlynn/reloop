import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
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
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/sell" element={<CreateProductPage />} />
              <Route path="/checkout/:orderId" element={<CheckoutPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/chat/:recipientId" element={<ChatInterface />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
