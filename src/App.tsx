import { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import About from './pages/About';
import Contact from './pages/Contact';
import Admin from './pages/Admin';

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
    switch (currentPath) {
      case '/':
        return <Home />;
      case '/services':
        return <Services />;
      case '/tarifs':
        return <Pricing />;
      case '/blog':
        return <Blog />;
      case '/about':
        return <About />;
      case '/contact':
        return <Contact />;
      case '/admin':
        return <Admin />;
      default:
        return <Home />;
    }
  };

  const isAdminPage = currentPath === '/admin';

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
