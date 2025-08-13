import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      // In a real app, you'd want a more robust validation system
      alert("Passwords don't match!");
      return;
    }
    const { success } = await register(formData);
    if (success) {
      navigate('/login'); // Redirect to login after successful registration
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input label="Full Name" name="fullName" type="text" required value={formData.fullName} onChange={handleChange} />
            <Input label="Username" name="username" type="text" required value={formData.username} onChange={handleChange} />
            <Input label="Email address" name="email" type="email" required value={formData.email} onChange={handleChange} />
            <Input label="Phone Number" name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={handleChange} />
            <Input label="Password" name="password" type="password" required value={formData.password} onChange={handleChange} />
            <Input label="Confirm Password" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
          </div>

          <div>
            <Button type="submit" className="w-full flex justify-center" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : 'Sign up'}
            </Button>
          </div>
          {error && <p className="mt-2 text-center text-sm text-red-600">{error.message || 'An unexpected error occurred.'}</p>}
        </form>
        <div className="text-sm text-center mt-4">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
