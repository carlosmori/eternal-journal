'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storeTokens } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      storeTokens(accessToken, refreshToken);
      router.replace('/journal');
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 dark:from-[#0f0520] dark:via-[#150a30] dark:to-[#1a0535]">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full border-2 border-violet-400/60 border-t-violet-600 dark:border-violet-300/60 dark:border-t-violet-200 animate-spin" />
        <p className="mt-4 text-violet-600 dark:text-violet-400 text-sm font-medium">
          Signing you in...
        </p>
      </div>
    </main>
  );
}
