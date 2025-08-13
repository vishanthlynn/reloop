import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth.jsx';
import { UserPlus, User, Mail, Lock } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { register, isLoading, error } = useAuthContext();
  const navigate = useNavigate();
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords don't match!");
      return;
    }
    const { name, email, password } = formData;
    const success = await register({ name, email, password });
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
      <div className="max-w-4xl w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden md:flex">
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an Account</h2>
          <p className="text-gray-600 mb-8">Join our community and start trading today.</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
                {!isLoading && <UserPlus className="w-5 h-5" />}
              </button>
            </div>
            {error && <p className="mt-2 text-center text-sm text-red-600">{error.message || 'Registration failed. Please try again.'}</p>}
          </form>
          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
        <div className="hidden md:block md:w-1/2 bg-indigo-50 p-8">
          <div className="flex items-center justify-center h-full">
             <img src="/img/auth-illustration.svg" alt="Register Illustration" className="max-w-full h-auto"/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
