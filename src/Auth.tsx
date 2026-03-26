import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Mail, Lock, User, Key, Loader2 } from 'lucide-react';
import { supabase } from './supabase';
import { saveProfile, getProfile, Profile, checkClassCode } from './data';

interface AuthProps {
  onAuthSuccess: (profile: Profile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (authError) {
          if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. If you just signed up, please check your password.');
          }
          throw authError;
        }

        if (!data.user) throw new Error('Login failed');

        // Fetch profile
        const profile = await getProfile(data.user.id);
        
        if (!profile) {
          // If auth exists but profile doesn't, we need to create it.
          // For now, we'll ask them to "Sign Up" again which will trigger the profile creation logic
          // Or we can show a "Complete Profile" form.
          // Let's try to be smart: if they are logged in but have no profile, 
          // we'll redirect them to a state where they can fill in their name and role.
          setError('Account exists but profile is missing. Please switch to "Sign Up" tab, enter your name and role, and click Sign Up again to complete your profile.');
          await supabase.auth.signOut(); // Sign out to let them "Sign Up" properly
          return;
        }
        onAuthSuccess(profile);
      } else {
        // Validation for student
        if (role === 'student') {
          if (!classCode) {
            throw new Error('Class code is required for students');
          }
          const isValidCode = await checkClassCode(classCode);
          if (!isValidCode) {
            throw new Error('Invalid class code. Please check with your teacher.');
          }
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        // If user already exists in Auth but we reached here, it means they need a profile
        if (authError?.message.includes('User already registered')) {
          // Try to sign in first to get the ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            throw new Error('This email is already registered. Please try to Sign In. If you forgot your password, please use a different email.');
          }

          if (signInData.user) {
            const newProfile: Profile = {
              id: signInData.user.id,
              email,
              role,
              name,
              class_code: role === 'student' ? classCode : undefined,
            };
            const result = await saveProfile(newProfile);
            if (!result.success) throw new Error(result.error);
            onAuthSuccess(newProfile);
            return;
          }
        }
        
        if (authError) throw authError;
        if (!data.user) throw new Error('Signup failed');

        const newProfile: Profile = {
          id: data.user.id,
          email,
          role,
          name,
          class_code: role === 'student' ? classCode : undefined,
        };

        const result = await saveProfile(newProfile);
        if (!result.success) throw new Error(result.error);

        onAuthSuccess(newProfile);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#4A90E2] rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white w-10 h-10" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-[#2D3436] mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-[#636E72] mb-8">
            {isLogin ? 'Sign in to continue learning' : 'Join our learning community'}
          </p>

          {!isLogin && (
            <div className="flex p-1 bg-[#F1F3F5] rounded-xl mb-6">
              <button
                onClick={() => setRole('student')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === 'student' ? 'bg-white text-[#4A90E2] shadow-sm' : 'text-[#636E72]'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setRole('teacher')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === 'teacher' ? 'bg-white text-[#4A90E2] shadow-sm' : 'text-[#636E72]'
                }`}
              >
                Teacher
              </button>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3 text-[#B2BEC3] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#B2BEC3] w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-[#B2BEC3] w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all"
              />
            </div>

            {!isLogin && role === 'student' && (
              <div className="relative">
                <Key className="absolute left-3 top-3 text-[#B2BEC3] w-5 h-5" />
                <input
                  type="text"
                  placeholder="Class Code (from teacher)"
                  required
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all"
                />
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#4A90E2] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-[#357ABD] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#4A90E2] font-medium hover:underline"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Debug Info</p>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500">Supabase URL: <span className="text-gray-900">{(supabase as any).supabaseUrl?.includes('placeholder') ? '❌ Missing' : '✅ Connected'}</span></p>
                <p className="text-[10px] text-gray-500">Supabase Key: <span className="text-gray-900">{(supabase as any).supabaseKey === 'placeholder-key' ? '❌ Missing' : '✅ Detected'}</span></p>
                <p className="text-[10px] text-gray-400 mt-2">Check AI Studio Secrets for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
