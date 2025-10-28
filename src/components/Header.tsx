import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Phone, X } from 'lucide-react';
import faviconLight from '../assets/favicon_light.png';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activePath, setActivePath] = useState('/');

  const navLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Tarifs', path: '/tarifs' },
    { name: 'Blog', path: '/blog' },
    { name: 'À propos', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  useEffect(() => {
    // set initial active path
    if (typeof window !== 'undefined') setActivePath(window.location.pathname || '/');

    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // disable body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    // preserve scroll position by fixing body when the menu is open
    const scrollY = window.scrollY || window.pageYOffset || 0;
    if (isOpen) {
      // lock scroll by fixing body; store current scroll in a ref handled below
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      // restore
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      if (top) {
        const prev = parseInt(top.replace('-', '').replace('px', ''), 10) || 0;
        window.scrollTo(0, prev);
      }
    }
    return () => {
      // clean up in case component unmounts while menu open
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // update activePath when user navigates using browser controls
  useEffect(() => {
    const onPop = () => setActivePath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // close mobile overlay if viewport is resized to desktop width
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && isOpen) setIsOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen]);

  // auto-close mobile overlay when user scrolls (improves UX)
  useEffect(() => {
    const allowCloseRef = { current: false } as { current: boolean };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScrollClose = () => {
      if (isOpen && allowCloseRef.current && window.scrollY > 20) setIsOpen(false);
    };
    // After opening, allow scroll-close only after a short delay to avoid layout-change close
    if (isOpen) {
      allowCloseRef.current = false;
      timer = setTimeout(() => { allowCloseRef.current = true; }, 250);
    }
    window.addEventListener('scroll', onScrollClose, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScrollClose);
    };
  }, [isOpen]);

  // header becomes translucent + blurred when scrolled, otherwise mostly transparent
  const headerClasses = `fixed w-full top-0 z-50 transition-colors duration-200 ${isScrolled ? 'bg-black/65 backdrop-blur-sm border-b border-gray-800/40' : 'bg-transparent border-b border-transparent'}`;

  return (
  <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* left: logo */}
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center">
              <img src={faviconLight} alt="France Parts" className="w-12 h-12 object-contain rounded" />
            </a>
          </div>

          {/* center: nav */}
          <nav className="hidden md:flex space-x-8 mx-auto">
            {navLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                className={`transition-colors duration-300 font-medium nav-underline ${activePath === link.path ? 'text-yellow-500' : 'text-gray-100 hover:text-yellow-500'}`}
                onClick={() => setActivePath(link.path)}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* right: phone pill */}
          <div className="hidden md:flex items-center">
            <a href="tel:+32497025806" className="flex items-center space-x-2 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 font-medium shadow-lg hover:shadow-yellow-400/25"
              title="Appelez-nous maintenant"
            >
              <Phone size={18} className="animate-pulse" />
              <span>+32 497 02 58 06</span>
            </a>
          </div>

          {/* mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-100 hover:text-yellow-500 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 z-[99999] flex items-start justify-start p-4 pt-20">
          {/* dimmed blurred backdrop (behind panel) */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[99990]" onClick={() => setIsOpen(false)} />

          {/* centered panel with internal scrolling so it's fully accessible on small viewports */}
          <div className="relative z-[99999] w-full max-w-md mx-4 max-h-[calc(100vh-6rem)] overflow-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
            <div className="bg-app/95 rounded-2xl shadow-2xl animate-slide-down overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
                <a href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                  <img src={faviconLight} alt="logo" className="w-10 h-10 object-contain rounded" />
                  <span className="text-white font-semibold">France Parts</span>
                </a>
                <button onClick={() => setIsOpen(false)} className="p-3 rounded-lg bg-white/5 text-white">
                  <X size={22} />
                </button>
              </div>

              <nav className="px-6 py-8">
                <ul className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <li key={link.path}>
                      <a
                        href={link.path}
                        onClick={() => { setIsOpen(false); setActivePath(link.path); }}
                        className={`block text-lg md:text-xl font-semibold transition-colors ${activePath === link.path ? 'text-yellow-500' : 'text-gray-100 hover:text-yellow-500'}`}
                      >
                        <span className="inline-block align-middle">{link.name}</span>
                        {activePath === link.path && (
                          <span className="ml-3 inline-block w-6 h-0.5 bg-yellow-500 rounded-full align-middle" />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="px-6 pb-8">
                <a href="tel:+32497025806" className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold">
                  <Phone size={18} />
                  <span>+32 497 02 58 06</span>
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
