import { Facebook, Instagram, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black text-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="bg-[#071018] rounded-2xl p-8 border border-gray-800/60">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-24 h-24 rounded-lg flex items-center justify-center">
                <img src="/src/assets/favicon_light.png" alt="France Parts" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-lg font-bold">France Parts</div>
                <div className="text-sm text-gray-400">Pièces & Véhicules Français</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Spécialistes en pièces neuves et d'occasion pour véhicules français.
              Achat & vente, expertise et livraison partout en Europe.
            </p>
          </div>

          {/* Navigation */}
          <div className="bg-[#071018] rounded-2xl p-8 border border-gray-800/60">
            <h4 className="flex items-center gap-3 text-lg font-bold mb-6">
              <span className="inline-block w-1 h-6 bg-[#2563eb] rounded" />
              Navigation
            </h4>
            <nav className="flex flex-col gap-3 text-gray-300">
              <a href="/" className="hover:text-yellow-500">Accueil</a>
              <a href="/services" className="hover:text-yellow-500">Services</a>
              <a href="/pricing" className="hover:text-yellow-500">Tarifs</a>
              <a href="/zone" className="hover:text-yellow-500">Zone de Service</a>
              <a href="/promotions" className="hover:text-yellow-500">Promotions</a>
              <a href="/contact" className="hover:text-yellow-500">Contact</a>
            </nav>
          </div>

          {/* Hours */}
          <div className="bg-[#071018] rounded-2xl p-8 border border-gray-800/60">
            <h4 className="flex items-center gap-3 text-lg font-bold mb-6">
              <span className="inline-block w-1 h-6 bg-[#2563eb] rounded" />
              Heures d'Ouverture
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#061018] p-3 rounded-md">
                <span>Lundi - Samedi</span>
                <div className="text-blue-300 font-semibold">8h-19h</div>
              </div>
              
              <div className="flex items-center justify-between bg-[#061018] p-3 rounded-md">
                <span>Dimanche</span>
                <div className="text-blue-300 font-semibold">Fermé</div>
              </div>
            </div>
        {/* separator */}
        <div className="my-8 border-t border-gray-800/60" />
            <h4 className="flex items-center gap-3 text-lg font-bold mb-6">
              <span className="inline-block w-1 h-6 bg-[#2563eb] rounded" />
              Suivez-nous
            </h4>
            <div className="">
              <div className="flex flex-row gap-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#0f1720] rounded-lg flex items-center justify-center hover:bg-yellow-500 transition-colors duration-300 group"
                >
                  <Facebook className="w-5 h-5 text-gray-100 group-hover:text-gray-900" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#2c1530] rounded-lg flex items-center justify-center hover:bg-yellow-500 transition-colors duration-300 group"
                >
                  <Instagram className="w-5 h-5 text-gray-100 group-hover:text-gray-900" />
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#101317] rounded-lg flex items-center justify-center hover:bg-yellow-500 transition-colors duration-300 group"
                >
                  <svg
                    className="w-5 h-5 text-gray-100 group-hover:text-gray-900"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>


          {/* Contact details */}
          <div className="bg-[#071018] rounded-2xl p-8 border border-gray-800/60">
            <h4 className="flex items-center gap-3 text-lg font-bold mb-6">
              <span className="inline-block w-1 h-6 bg-[#2563eb] rounded" />
              Coordonnées
            </h4>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-yellow-500 mb-1">Adresse</h3>
                  <p className="text-gray-300">Rue de Mérode 174 1060<br />Saint-Gilles</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-yellow-500 mb-1">Téléphone</h3>
                  <p className="text-gray-300">+32 466 40 72 56</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-yellow-500 mb-1">Email</h3>
                  <p className="text-gray-300">Doc'trot@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} France Parts. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
