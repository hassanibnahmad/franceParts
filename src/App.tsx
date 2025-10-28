import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import AdminReset from './pages/AdminReset';
import NotFound from './pages/NotFound';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = new URL(anchor.href).pathname;
        window.history.pushState({}, '', path);
        setCurrentPath(path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const renderPage = () => {
    // exact match for listing
    if (currentPath === '/') return <Home />;
    if (currentPath === '/home') return <Home />;
    if (currentPath === '/services') return <Services />;
    if (currentPath === '/tarifs') return <Pricing />;
    if (currentPath === '/blog') return <Blog />;

    // dynamic blog detail: /blog/:slug
    if (currentPath.startsWith('/blog/')) {
      const parts = currentPath.split('/').filter(Boolean);
      // parts[0] === 'blog', parts[1] === slug
      const slug = parts[1] ? decodeURIComponent(parts[1]) : '';
      if (slug) return <BlogDetail slug={slug} />;
      return <Blog />;
    }

    if (currentPath === '/about') return <About />;
    if (currentPath === '/contact') return <Contact />;
    if (currentPath === '/admin') return <Admin />;
    if (currentPath === '/admin/reset') return <AdminReset />;

    {/*not found page */}
    return <NotFound />;
  };

  const isAdminPage = currentPath.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-900">
      {!isAdminPage && <Header />}
      <main>{renderPage()}</main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <WhatsAppButton />}
    </div>
  );
}

export default App;
