import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

type PricingItem = {
  service: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
};

const DEFAULT_PRICING: PricingItem[] = [
    {
      service: 'Diagnostic rapide',
      price: '29€',
      description: 'Diagnostic électronique complet de votre véhicule',
      features: [
        'Lecture des codes défaut',
        'Rapport détaillé',
        'Conseils de réparation',
        'Durée: 30 minutes'
      ]
    },
    {
      service: "Pièce d'occasion",
      price: 'À partir de 15€',
      description: "Pièces d'occasion vérifiées et garanties",
      features: [
        'Pièces testées',
        'Garantie 6 mois',
        'Large choix',
        'Disponibilité immédiate'
      ],
      popular: true
    },
    {
      service: 'Pièce neuve',
      price: 'À partir de 49€',
      description: "Pièces neuves d'origine constructeur",
      features: [
        "Pièces d'origine",
        'Garantie constructeur',
        'Commande rapide',
        'Livraison possible'
      ]
    },
    {
      service: 'Entretien complet',
      price: '149€',
      description: 'Révision complète de votre véhicule',
      features: [
        'Vidange + filtre',
        'Contrôle freins',
        'Contrôle suspension',
        'Rapport détaillé'
      ]
    },
    {
      service: 'Expertise véhicule',
      price: '89€',
      description: 'Expertise complète avant achat/vente',
      features: [
        'Contrôle mécanique',
        'Contrôle carrosserie',
        'Estimation valeur',
        'Rapport écrit'
      ]
    },
    {
      service: 'Recherche de pièce',
      price: 'Devis gratuit',
      description: 'Recherche personnalisée de pièces',
      features: [
        'Toutes marques',
        'Neuf et occasion',
        'Meilleur prix',
        'Délai garanti'
      ]
    }
  ];
export default function Pricing() {
  // pricing data (read-only on public page) - initialized from localStorage
  const [pricingData] = useState<PricingItem[]>(() => {
    try {
      const raw = localStorage.getItem('pricingData');
      return raw ? JSON.parse(raw) : DEFAULT_PRICING;
    } catch (err) {
      return DEFAULT_PRICING;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pricingData', JSON.stringify(pricingData));
    } catch (e) {
      // ignore
    }
  }, [pricingData]);

  // pricing page is display-only; admin CRUD lives at /admin

  return (
    <div className="min-h-screen pt-20 pb-20">
      
  <div className="bg-gradient-to-br from-black to-gray-900 py-24 bg-squares">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 data-aos="fade-up" data-aos-duration="3500" className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
            Nos <span className="text-yellow-500">Tarifs</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Des prix clairs et compétitifs pour chaque service
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingData.map((item: PricingItem, index: number) => (
            <div
              key={index}
              className={`bg-gray-800 rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                  item.popular ? 'border-4 border-yellow-500 relative' : 'border border-gray-700'
                }`}
            >
              {/* public view (no admin controls) */}
              {item.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                    Plus populaire
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-100 mb-2">{item.service}</h3>
                <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                <div className="text-4xl font-bold text-yellow-500">{item.price}</div>
              </div>

              <ul className="space-y-4 mb-8">
                {item.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-gray-300">
                    <Check className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/contact"
                className={`block text-center py-3 rounded-lg font-bold transition-all duration-300 ${
                  item.popular
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                        : 'bg-gray-900 text-yellow-500 hover:bg-gray-800'
                }`}
              >
                Demander un devis
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700">
          <h2 className="text-3xl font-bold text-center text-gray-100 mb-6">
            Informations <span className="text-yellow-500">Importantes</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-bold text-lg text-gray-100 mb-3">Modes de paiement</h3>
              <ul className="text-gray-300 space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Espèces
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Carte bancaire
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Virement
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Chèque
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-100 mb-3">Garanties</h3>
              <ul className="text-gray-300 space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Pièces neuves: garantie constructeur
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Pièces d'occasion: 6 mois
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Main d'œuvre: 3 mois
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-yellow-500 mr-2" />
                  Satisfaction garantie
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-gray-800 rounded-2xl p-12 text-center shadow-2xl border border-yellow-500/20">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-6 reveal">
            Besoin d'un devis personnalisé ?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Contactez-nous pour obtenir un devis adapté à vos besoins spécifiques
          </p>
          <a
            href="/contact"
            className="inline-block bg-gray-900 text-yellow-500 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-xl"
          >
            Demander un devis
          </a>
        </div>
      </div>
      {/* Admin modal removed from public pricing page; use /admin for CRUD */}
    </div>
  );
}
