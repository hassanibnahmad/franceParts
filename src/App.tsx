// import logoImg from './assets/logo.png';
// import carBg from './assets/image.png';

// function App() {
//   return (
//     <div className="min-h-screen bg-gray-900">
//       <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-black via-surface to-black overflow-hidden">
//         <div className="absolute top-20 left-0 w-full flex justify-center pointer-events-none">
//           <div className="w-full max-w-6xl h-24 md:h-28 lg:h-32"></div>
//         </div>
//         <div
//           className="absolute inset-0 bg-cover bg-center filter brightness-50"
//           style={{ backgroundImage: `url(${carBg})` }}
//         ></div>
//         {/* dark overlay to ensure image fits dark theme */}
//         <div className="absolute inset-0 bg-black/60"></div>

//         <div className="relative z-20 flex items-center justify-center px-4">
//           <div className="flex items-center w-full max-w-xl p-6 rounded-lg border border-orange-600 bg-orange-950 shadow-2xl">
//             <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-orange-400 bg-orange-900/50 rounded-full mr-4">
//               <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                 <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
//               </svg>
//             </div>
//             <div className="flex-1">
//               <p className="text-sm font-medium text-orange-100">Ce site est actuellement indisponible. Merci de contacter le développeur afin d'en rétablir l'accès. 
//                 <a href="https://wa.me/212646426335" 
//                  className='text-green-400 underline cursor-pointer'> +212 646-426335
//                  </a>
//               </p>
//             </div>
              
//             <img src={logoImg} alt="Close" className='w-10 h-10' />
           
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }

// export default App;
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
