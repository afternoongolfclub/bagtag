
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { X, Mail, Lock, User as UserIcon, LogIn, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
        setError('Verification email sent! Please check your inbox.');
      } else {
        await login(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400"><X size={20} /></button>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><LogIn size={24} /></div>
            <h2 className="text-2xl font-bold">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-slate-500 mt-2 text-sm">{isSignUp ? 'Join the pro golfer community.' : 'Sign in to access your clubs.'}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="Your Name" required />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" placeholder="••••••••" required />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-70">{loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}{!loading && <ArrowRight size={18} />}</button>
          </form>
          <div className="mt-6 text-center"><p className="text-sm text-slate-600">{isSignUp ? 'Already have an account?' : "Don't have an account?"} <button onClick={() => setIsSignUp(!isSignUp)} className="text-emerald-600 font-medium">{isSignUp ? 'Sign In' : 'Sign Up'}</button></p></div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
