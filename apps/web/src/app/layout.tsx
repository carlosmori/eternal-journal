import type { Metadata } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Web3Provider } from '@/components/Web3Provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eternal Journal',
  description: 'Your journal lasts forever',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value;
  const isDark =
    themeCookie === 'dark' ||
    (themeCookie === 'light' ? false : undefined);

  const htmlClass = isDark === true ? 'dark' : isDark === false ? '' : '';

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <body className="antialiased">
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
          <ThemeProvider initialTheme={themeCookie as 'dark' | 'light' | undefined}>
            {children}
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
