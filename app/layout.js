import '@/app/globals.css';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

export const metadata = {
  title: 'GWD XR – AR Menu Platform',
  description: 'Turn your restaurant menu into an immersive AR experience. Customers scan a QR code, see 3D food on their table, and order directly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d1117" />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
