import {Target, Award, Heart } from 'lucide-react';
import magasin2 from '../assets/magasin2.png';
import { useSeo } from '../lib/seo';
export default function About() {
  useSeo('France Parts | À propos — Pièces auto neuves et d\'occasion', 'France Parts, spécialiste en pièces automobiles neuves et d\'occasion en Saint Gilles, Bruxelles, Belgique. Découvrez notre histoire, nos valeurs et notre engagement qualité.');
  const values = [
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Notre Mission',
      description: 'Offrir un service fiable, rapide et professionnel avec un large choix de pièces de qualité pour tous les véhicules français.'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Notre Passion',
      description: 'Passionnés par l\'automobile française, nous mettons notre expertise au service de votre satisfaction et de la longévité de votre véhicule.'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Notre Engagement',
      description: 'Des pièces vérifiées, des prix compétitifs, et un service client irréprochable. Votre confiance est notre priorité.'
    }
  ];

  const stats = [
    { value: '15+', label: 'Années d\'expérience' },
    { value: '5000+', label: 'Clients satisfaits' },
    { value: '10000+', label: 'Pièces en stock' },
    { value: '100%', label: 'Engagement qualité' }
  ];

  return (
    <div className="min-h-screen pt-20 pb-20">
  <div className="bg-gradient-to-br from-black to-gray-900 py-24 bg-squares">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 data-aos="fade-up" data-aos-duration="3500" className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
            À propos de <span className="text-yellow-500">France Parts</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto l eading-relaxed">
            Votre partenaire de confiance pour l'automobile française depuis 2009
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
  <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 data-aos="fade-up" data-aos-duration="3500" className="text-4xl font-bold text-gray-100 mb-6">
                Une équipe de <span className="text-yellow-500">passionnés</span>
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                France Parts est née de la passion pour l'automobile française. Fondée en 2009, notre entreprise s'est développée autour d'une vision simple : offrir un service de qualité accessible à tous les propriétaires de véhicules Peugeot, Renault et Citroën.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                Notre équipe d'experts automobiles met son savoir-faire et son expérience à votre service pour vous accompagner dans tous vos projets : recherche de pièces, achat de véhicule, entretien et réparation.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Nous croyons en la qualité, la transparence et le service personnalisé. Chaque client est unique et mérite une attention particulière. C'est cette philosophie qui guide notre travail au quotidien.
              </p>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-2xl p-1">
                <div className="bg-gray-900 rounded-2xl  flex items-center justify-center h-full">
                  <img src={magasin2} alt="magasin de France Parts" className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-400 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center mb-12">
            <h2 data-aos="fade-up" data-aos-duration="3500" className="text-4xl font-bold text-gray-100 mb-4">
              Nos <span className="text-yellow-500">Valeurs</span>
            </h2>
          <p className="text-gray-300 text-lg">
            Ce qui nous anime au quotidien
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 cursor-pointer">
          {values.map((value, index) => (
            <div
              key={index}
              data-aos="fade-up"
              data-aos-duration="3500"
              data-aos-delay={index * 120}
              className="bg-gray-800 rounded-xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-t-4 border-yellow-500"
            >
              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mb-6 text-gray-900">
                {value.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-4">{value.title}</h3>
              <p className="text-gray-300 leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-black to-gray-900 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
              <h2 data-aos="fade-up" data-aos-duration="3500" className="text-4xl font-bold text-gray-100 mb-4">
              France Parts en <span className="text-yellow-500">Chiffres</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                data-aos="fade-up"
                data-aos-duration="3500"
                data-aos-delay={index * 120}
                className="text-center bg-gray-800/50 rounded-xl p-6 border border-yellow-500/20 hover:border-yellow-500 transition-all duration-300"
              >
                <div className="text-4xl md:text-5xl font-bold text-yellow-500 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="bg-gray-800 rounded-2xl p-12 text-center shadow-2xl border border-yellow-500/20">
            <h2 data-aos="fade-up" data-aos-duration="3500" className="text-3xl md:text-4xl font-bold text-gray-100 mb-6">
            Rejoignez notre communauté de clients satisfaits
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Découvrez pourquoi des milliers de clients nous font confiance pour leurs véhicules français
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
