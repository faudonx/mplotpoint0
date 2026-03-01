import { useState, useRef } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export function AuthModal({ isOpen, onClose }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);

  // Form states
  const [loginNickname, setLoginNickname] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const isNicknameAvailable = async (nickname: string) => {
    const q = query(collection(db, "users"), where("nickname", "==", nickname));
    const snap = await getDocs(q);
    return snap.empty;
  };

  const getUserByNickname = async (nickname: string) => {
    const q = query(collection(db, "users"), where("nickname", "==", nickname));
    const snap = await getDocs(q);
    if (!snap.empty) return { email: snap.docs[0].data().email };
    return null;
  };

  const generateUniqueNickname = async (baseName: string) => {
    let nickname = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let counter = 1;
    while (!(await isNicknameAvailable(nickname))) {
      nickname = baseName.toLowerCase().replace(/[^a-z0-9]/g, '') + counter;
      counter++;
    }
    return nickname;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const nickname = await generateUniqueNickname(firstName || user.email?.split('@')[0] || 'user');
        
        await setDoc(userDocRef, {
          fullName: displayName,
          nickname: nickname,
          email: user.email,
          photoURL: user.photoURL || null,
          provider: 'google',
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        alert('Google Sign-In failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginNickname || !loginPassword) return alert('Fill both fields');
    setLoading(true);
    try {
      const userData = await getUserByNickname(loginNickname);
      if (!userData) {
        alert('Nickname not found');
        return;
      }
      await signInWithEmailAndPassword(auth, userData.email, loginPassword);
      onClose();
    } catch (e: any) {
      alert('Login failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regFullName || !regNickname || !regEmail || !regPassword || regPassword.length < 6) {
      return alert('All fields required, password min 6');
    }
    setLoading(true);
    try {
      if (!(await isNicknameAvailable(regNickname))) {
        alert('Nickname taken');
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await setDoc(doc(db, "users", cred.user.uid), { 
        fullName: regFullName, 
        nickname: regNickname, 
        email: regEmail, 
        photoURL: null,
        provider: 'email',
        createdAt: new Date().toISOString() 
      });
      onClose();
    } catch (e: any) {
      alert('Registration failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (login: boolean) => {
    setIsLogin(login);
    if (swipeRef.current) {
      swipeRef.current.scrollTo({
        left: login ? 0 : swipeRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-[90%] max-w-[450px] bg-modal-bg rounded-2xl p-8 border border-white/10 relative max-h-[90vh] overflow-y-auto animate-scaleIn">
        <button className="absolute top-4 right-6 text-white hover:text-accent transition-colors" onClick={onClose}>
          <X className="w-6 h-6" />
        </button>

        <div 
          ref={swipeRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-0 scrollbar-hide rounded-2xl my-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIsLogin(el.scrollLeft < el.clientWidth / 2);
          }}
        >
          {/* Login Card */}
          <div className="min-w-full snap-start p-2">
            <h3 className="text-3xl font-bold mb-2">Welcome Back</h3>
            <p className="text-text-secondary mb-8 text-[0.95rem]">Login to continue your cinematic journey</p>
            
            <button 
              className="w-full p-3.5 bg-white text-[#1f1f1f] border border-[#dadce0] rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all duration-200 flex items-center justify-center gap-3 mb-4 hover:bg-[#f8f9fa] hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:-translate-y-px active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.737 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            
            <div className="flex items-center my-6 text-text-secondary text-[0.85rem] before:content-[''] before:flex-1 before:h-px before:bg-white/10 after:content-[''] after:flex-1 after:h-px after:bg-white/10">
              <span className="px-4">or</span>
            </div>
            
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={loginNickname}
                onChange={e => setLoginNickname(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Username</label>
            </div>
            <div className="relative mb-6">
              <input 
                type="password" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Password</label>
            </div>
            <button 
              className="w-full p-4 bg-accent text-white border-none rounded-xl text-base font-bold cursor-pointer transition-all duration-200 mt-4 flex items-center justify-center gap-2 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(255,69,0,0.3)] disabled:opacity-70 disabled:pointer-events-none"
              onClick={handleLogin}
              disabled={loading}
            >
              <LogIn className="w-5 h-5" /> Log In
            </button>
            <div className="text-center mt-6 text-text-secondary text-[0.9rem]">
              Don't have an account? 
              <button className="text-accent font-semibold cursor-pointer bg-transparent border-none p-0 ml-1 hover:underline" onClick={() => toggleView(false)}>Sign up</button>
            </div>
          </div>

          {/* Register Card */}
          <div className="min-w-full snap-start p-2">
            <h3 className="text-3xl font-bold mb-2">Create Account</h3>
            <p className="text-text-secondary mb-8 text-[0.95rem]">Join MPlotPoint and start exploring</p>
            
            <button 
              className="w-full p-3.5 bg-white text-[#1f1f1f] border border-[#dadce0] rounded-xl font-semibold text-[0.95rem] cursor-pointer transition-all duration-200 flex items-center justify-center gap-3 mb-4 hover:bg-[#f8f9fa] hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:-translate-y-px active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.737 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
            
            <div className="flex items-center my-6 text-text-secondary text-[0.85rem] before:content-[''] before:flex-1 before:h-px before:bg-white/10 after:content-[''] after:flex-1 after:h-px after:bg-white/10">
              <span className="px-4">or</span>
            </div>
            
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={regFullName}
                onChange={e => setRegFullName(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Full Name</label>
            </div>
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={regNickname}
                onChange={e => setRegNickname(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Username</label>
            </div>
            <div className="relative mb-6">
              <input 
                type="email" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Email Address</label>
            </div>
            <div className="relative mb-6">
              <input 
                type="password" 
                placeholder=" " 
                className="floating-input w-full p-4 border-2 border-white/10 rounded-xl bg-[#1e3347]/30 text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:bg-[#1e3347]/50"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
              />
              <label className="absolute left-5 top-4 text-[#8a9aa8] pointer-events-none transition-all duration-200 bg-transparent px-1 text-[0.95rem]">Password</label>
            </div>
            <button 
              className="w-full p-4 bg-accent text-white border-none rounded-xl text-base font-bold cursor-pointer transition-all duration-200 mt-4 flex items-center justify-center gap-2 hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(255,69,0,0.3)] disabled:opacity-70 disabled:pointer-events-none"
              onClick={handleRegister}
              disabled={loading}
            >
              <UserPlus className="w-5 h-5" /> Create Account
            </button>
            <div className="text-center mt-6 text-text-secondary text-[0.9rem]">
              Already have an account? 
              <button className="text-accent font-semibold cursor-pointer bg-transparent border-none p-0 ml-1 hover:underline" onClick={() => toggleView(true)}>Log in</button>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 my-4">
          <span className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${isLogin ? 'bg-accent w-8' : 'bg-text-secondary'}`} onClick={() => toggleView(true)}></span>
          <span className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 ${!isLogin ? 'bg-accent w-8' : 'bg-text-secondary'}`} onClick={() => toggleView(false)}></span>
        </div>
      </div>
    </div>
  );
}
