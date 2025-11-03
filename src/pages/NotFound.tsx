 
import logo from "../assets/logo.png";
import img404 from "../assets/404.png";
import { Home, ArrowLeft } from "lucide-react";
import { useSeo } from '../lib/seo';

export default function NotFound() {
  useSeo('France Parts | Page introuvable', 'Page 404 — France Parts. Retournez à l\'accueil ou utilisez la navigation pour trouver nos pièces et services.');
  return (
    <main role="main" className="min-h-screen flex items-start justify-center bg-black text-white px-4 py-12 pt-20 relative overflow-hidden">
      {/* Background image (soft, behind content) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${img404})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          opacity: 0.7,
          filter: 'blur(2px) brightness(0.55)'
        }}
      />

      <div className="w-full max-w-3xl text-center p-6 animate-fade-in relative">
        {/* Logo */}
        <img
          src={logo}
          alt="France Parts"
           className="h-24 md:h-32 w-auto mx-auto object-contain animate-gentle-bounce"
                style={{ 
                  filter: 'drop-shadow(0 0 20px rgba(250, 204, 21, 0.3))',
                }}
        />

        {/* Heading */}
        <div className="my-8">
          <h1 className="text-8xl md:text-9xl font-bold text-yellow-400 mb-4 animate-pulse">
                404
              </h1>
          <div className="w-20 h-1 bg-yellow-400 mx-auto mb-4" aria-hidden />
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">Oups — page introuvable</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Désolé, la page demandée est introuvable. Elle a peut‑être été renommée, déplacée ou supprimée.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
          <a href="/" className="flex items-center px-5 py-3 bg-yellow-400 text-black font-semibold rounded-lg">
            <Home className="w-5 h-5 mr-2" aria-hidden />
            Accueil
          </a>

          <button onClick={() => window.history.back()} className="flex items-center px-5 py-3 bg-gray-800 text-white font-semibold rounded-lg border border-gray-700">
            <ArrowLeft className="w-5 h-5 mr-2" aria-hidden />
            Page précédente
          </button>
        </div>


        {/* Helpful links and tip */}
        <div className="mt-6 pt-6 border-t border-b border-yellow-700 rounded-lg pb-6">
          <p className="text-gray-400 mb-4">Vous cherchiez peut-être :</p>
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <a href="/services" className="px-4 py-2 text-yellow-400 border border-yellow-400/30 rounded-lg">Nos Services</a>
            <a href="/about" className="px-4 py-2 text-yellow-400 border border-yellow-400/30 rounded-lg">À Propos</a>
            <a href="/blog" className="px-4 py-2 text-yellow-400 border border-yellow-400/30 rounded-lg">Blog</a>
            <a href="/contact" className="px-4 py-2 text-yellow-400 border border-yellow-400/30 rounded-lg">Contact</a>
          </div>
        </div>
      </div>
    </main>
  );
}
