import { useEffect, useState } from 'react';
import HomeScreen from '@/components/home/HomeScreen';
import SignupScreen from '@/components/SignupScreen';
import { getCurrentUsername, signOutUser } from '@/lib/auth';
import type { Account } from '@/lib/account';
import { isCurrentUserBanned } from '@/lib/admin';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let isActive = true;
    getCurrentUsername()
      .catch(() => null)
      .then(async (username) => {
        // A player banned while signed in is signed out on the next visit.
        if (username && (await isCurrentUserBanned().catch(() => false))) {
          await signOutUser();
          return null;
        }
        return username;
      })
      .then((username) => {
        if (!isActive) return;
        setAccount(username ? { displayName: username, isGuest: false } : null);
        setIsRestoring(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setAccount(null);
  };

  if (isRestoring) return <div className="min-h-screen bg-stone-50" />;
  if (!account) return <SignupScreen onEnter={setAccount} />;
  return <HomeScreen account={account} onSignOut={handleSignOut} />;
}

export default App;
