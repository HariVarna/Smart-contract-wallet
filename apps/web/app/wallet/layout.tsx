'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { useWallet } from '../../hooks/useWallet';

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  const { ownerAddress } = useWallet();
  const router = useRouter();

  // If no owner connected, redirect to onboarding
  useEffect(() => {
    if (!ownerAddress) {
      router.push('/onboarding');
    }
  }, [ownerAddress, router]);

  if (!ownerAddress) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Authenticating owner authority...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 max-w-7xl w-full mx-auto">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
