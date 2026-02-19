import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Web3Provider } from '@/components/Web3Provider';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Eternal Journal',
  description:
    'A place for your thoughts to live forever. Private, encrypted, and built with care.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  const isDark = themeCookie === 'dark' || (themeCookie === 'light' ? false : undefined);

  const htmlClass = isDark === true ? 'dark' : isDark === false ? '' : '';

  return (
    <html lang="en" className={`${jakarta.variable} ${htmlClass}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var c = document.cookie.match(/theme=(dark|light)/);
                var t = c ? c[1] : localStorage.getItem('theme');
                var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
              })();
            `,
          }}
        />
        <Web3Provider>
          <AuthProvider>
            <ThemeProvider initialTheme={themeCookie as 'dark' | 'light' | undefined}>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
