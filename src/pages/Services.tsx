import { Car, Cog, Package } from 'lucide-react';
import Accordion from '../components/Accordion';
import { useSeo } from '../lib/seo';

export default function Services() {
  useSeo('France Parts | Services — Pièces auto neuves et d\'occasion en Saint Gilles, Bruxelles, Belgique', 'Solutions complètes : vente de véhicules français, pièces neuves et d\'occasion, commande sur-mesure et livraison rapide.');
  const faqItems = [
    {
      question: "Quels types de véhicules français proposez-vous à la vente ?",
      answer: "Nous proposons une large gamme de véhicules Peugeot, Renault et Citroën, incluant des modèles neufs et d'occasion, adaptés à divers besoins et budgets."
    },
    {
      question: "Vendez-vous des pièces d'occasion ?",
      answer: "Oui, nous proposons une sélection de pièces d'occasion vérifiées et garanties, ainsi que des pièces neuves d'origine constructeur."
    },
    {
      question: "Proposez-vous des services de diagnostic et d'entretien ?",
      answer: "Oui, notre équipe d'experts offre des services complets de diagnostic, d'entretien et de réparation pour tous les véhicules français." 
    },
    {
      question: "Comment puis-je commander une pièce spécifique ?",
      answer: "Vous pouvez nous contacter directement avec les détails de la pièce dont vous avez besoin, et nous nous occuperons de la recherche et de la commande pour vous."
    }
  ];
  const services = [
    {
      icon: <Car className="w-12 h-12" />,
      title: 'Vente de véhicules français',
      description: 'Véhicules Peugeot, Renault et Citroën vérifiés et garantis. Large choix de modèles récents et occasions.',
      features: [
        'Inspection complète',
        'Historique vérifié',
        'Garantie constructeur',
        'Financement disponible'
      ]
    },
    {
      icon: <Cog className="w-12 h-12" />,
      title: "Pièces neuves et d'occasion",
      description: "Un large choix de pièces d'origine à des prix compétitifs pour tous les modèles français.",
      features: [
        'Pièces certifiées',
        'Stock permanent',
        'Prix compétitifs',
        'Livraison rapide'
      ]
    },
    /*{
      icon: <Wrench className="w-12 h-12" />,
      title: 'Diagnostic et entretien',
      description: 'Inspection, diagnostic et conseils d\'entretien automobile par nos experts.',
      features: [
        'Diagnostic électronique',
        'Entretien complet',
        'Réparation rapide',
        'Conseils personnalisés'
      ]
    },*/
    {
      icon: <Package className="w-12 h-12" />,
      title: 'Commande de pièces',
      description: 'Besoin d\'une pièce spécifique ? Nous pouvons commander toute pièce pour véhicules français.',
      features: [
        'Recherche sur mesure',
        'Délai garanti',
        'Toutes marques',
        'Suivi de commande'
      ]
    }
   /* {
      icon: <Search className="w-12 h-12" />,
      title: 'Expertise automobile',
      description: 'Analyse approfondie de l\'état de votre véhicule avant achat ou vente.',
      features: [
        'Contrôle technique',
        'Rapport détaillé',
        'Évaluation prix',
        'Conseils d\'expert'
      ]
    },
    {
      icon: <ShieldCheck className="w-12 h-12" />,
      title: 'Garantie et SAV',
      description: 'Service après-vente et garantie sur toutes nos pièces et véhicules.',
      features: [
        'Garantie étendue',
        'Support client',
        'Échange possible',
        'Suivi personnalisé'
      ]
    }*/
  ];

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div  className="bg-gradient-to-br from-black to-gray-900 py-24 bg-squares bg-hover ">
           
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 data-aos="fade-up" data-aos-duration="3500" className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
            Nos <span className="text-yellow-500">Services</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Des solutions complètes pour tous vos besoins en pièces et véhicules français
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              data-aos="fade-up"
              data-aos-duration="3500"
              data-aos-delay={index * 120}
              className="bg-gray-800 rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-t-4 border-yellow-500 group"
            >
              <div className="w-20 h-20 bg-yellow-500 rounded-xl flex items-center justify-center mb-6 text-gray-900 group-hover:scale-110 transition-transform duration-300">
                {service.icon}
              </div>

              <h3 className="text-2xl font-bold mb-4 text-gray-100">{service.title}</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">{service.description}</p>

              <ul className="space-y-3">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-300">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

        {/* FAQ Section */}
         <section className="py-20 bg-black mt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-4xl font-bold text-gray-100 text-center mb-12">Questions <span className="text-accent">Fréquentes</span></h2>
        
                  <Accordion items={faqItems} autoScroll={true} singleOpen={true} />
                </div>
          </section>
        

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-gray-800 rounded-2xl p-12 text-center shadow-2xl">
          <h2 data-aos="fade-up" data-aos-duration="3500" className="text-3xl md:text-4xl font-bold text-gray-100 mb-6">
            Besoin d'un service personnalisé ?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Contactez-nous pour discuter de vos besoins spécifiques. Notre équipe est là pour vous accompagner.
          </p>
          <a
            href="/contact"
            className="inline-block bg-gray-900 text-yellow-500 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-xl"
          >
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}
