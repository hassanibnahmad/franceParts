import {
  Settings,
  Wrench,
  Car,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import Accordion from '../components/Accordion';
import { useSeo } from '../lib/seo';
import { useState } from "react";
import logoImg from '../assets/logo.png';
import carBg from '../assets/car2.png';
import magasin2 from '../assets/magasin2.png';

export default function Home() {
  useSeo('France Parts | Pièces auto neuves et d\'occasion en Saint Gilles, Bruxelles, Belgique', 'France Parts, votre spécialiste en vente et achat de pièces automobiles neuves et d\'occasion. Livraison rapide et garantie.');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Jean D.",
      rating: 5,
      comment: "Pièce impeccable et service rapide !",
    },
    {
      name: "Marie L.",
      rating: 4.5,
      comment: "Bonne qualité pour les pièces d'occasion.",
    },
    {
      name: "Pierre M.",
      rating: 5,
      comment: "Excellent conseil pour l'achat de mon véhicule.",
    },
    {
      name: "Sophie R.",
      rating: 4,
      comment: "Service client très réactif et professionnel.",
    },
    {
      name: "Hassan I.",
      rating: 4.5,
      comment: "Large choix de pièces neuves à des prix compétitifs.",
    },
  ];

  const faqItems = [
    { question: "Combien de temps dure un lavage complet ?", answer: "Un lavage complet prend généralement entre 45 minutes et 1h30 selon l'état du véhicule et les options choisies." },
    { question: "Faites-vous le déplacement ?", answer: "Oui, nous proposons un service de déplacement pour certaines zones — contactez-nous pour un devis précis." },
    { question: "Quels produits utilisez-vous ?", answer: "Nous utilisons des produits professionnels homologués, adaptés aux peintures et aux matériaux intérieurs." },
    { question: "Proposez-vous des abonnements ?", answer: "Oui, des abonnements mensuels et annuels sont disponibles avec des réductions pour les clients réguliers." },
  ];

  const services = [
    {
      icon: Settings,
      title: "Vente Pièces Neuves",
      description: "Composants authentiques pour voitures françaises.",
    },
    {
      icon: Wrench,
      title: "Vente Pièces d'Occasion",
      description: "Pièces reconditionnées de qualité.",
    },
    {
      icon: Car,
      title: "Vente & Reprise Véhicules",
      description: "Achat, revente et reprise de véhicules français.",
    },
    
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <div className="min-h-screen">
  <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-black via-surface to-black overflow-hidden">
        <div className="absolute top-20 left-0 w-full flex justify-center pointer-events-none">
          <div className="w-full max-w-6xl h-24 md:h-28 lg:h-32"></div>
        </div>
  <div className="absolute inset-0 bg-cover bg-center filter brightness-50" style={{ backgroundImage: `url(${carBg})` }}></div>
        {/* dark overlay to ensure image fits dark theme */}
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center px-4 animate-fade-in">
          <div className=" mx-auto w-48 h-48 mb-4 animate-logo">
              <img
                src={logoImg}
                alt="France Parts logo"
                className="w-40 h-40"
              />
          </div>
          <h1
            data-aos="fade-up"
            data-aos-duration="3500"
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight flag-underline"
          >
            <span className="text-yellow-500">F</span>RANCE{" "}
            <span className="text-yellow-500">P</span>ARTS
          </h1>
          <p className="text-2xl md:text-3xl hero-subtext mb-4">
            Spécialiste Pièces & Véhicules Français
          </p>
          <p className="text-lg md:text-xl text-gray-300 mb-8">
            Pièces neuves et d'occasion | Achat & Vente de voitures françaises
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/services" className="cta-primary">Nos services</a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-accent rounded-full flex justify-center">
            <div className="w-1 h-3 bg-accent rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-app">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h2
                data-aos="fade-up"
                data-aos-duration="3500"
                className="text-4xl font-bold text-gray-100 mb-6"
              >
                Qui <span className="text-accent">sommes-nous</span> ?
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                France Parts est une entreprise dédiée aux passionnés de
                l'automobile française. Nous vendons des pièces neuves et
                d'occasion, et achetons/revendez des véhicules Peugeot, Renault
                et Citroën.
              </p>
            </div>
            <div
              data-aos="fade-up"
              data-aos-delay="120"
              data-aos-duration="3500"
              className="animate-fade-in delay-100"
            >
              <div className="aspect-video bg-gradient-to-br from-accent/20 to-transparent rounded-2xl overflow-hidden">
                <div className="relative">
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-2xl p-1">
                    <div className="bg-gray-900 rounded-2xl  flex items-center justify-center h-full">
                      <img
                        src={magasin2}
                        alt="magasin de France Parts"
                        className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

  <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-gray-100 text-center mb-16">
            Nos <span className="text-accent">Services</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-surface p-8 rounded-2xl border border-accent/20 hover:border-accent hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] transition-all duration-500 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <service.icon className="w-12 h-12 text-accent mb-4" />
                <h3 className="text-xl font-bold text-gray-100 mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
            
          </div>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a href="/services" className="cta-primary">Voir Plus</a>
          </div>
        </div>
      </section>

  <section className="py-20 bg-app">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-100 text-center mb-16">
            Avis <span className="text-[#FFD700]">Clients</span>
          </h2>
          <div className="relative bg-surface p-12 rounded-2xl border border-accent/20">
            <button
              onClick={prevTestimonial}
              aria-label="Précédent"
              className="absolute left-[-24px] top-1/2 -translate-y-1/2 w-16 h-16 bg-transparent rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg border border-[#FFD700]/20"
              style={{ backdropFilter: 'blur(2px)' }}
            >
              <span className="w-16 h-16 rounded-full flex items-center justify-center ">
                <ChevronLeft className="w-7 h-7 text-[#FFD700]" />
              </span>
            </button>

            <button
              onClick={nextTestimonial}
              aria-label="Suivant"
              className="absolute right-[-24px] top-1/2 -translate-y-1/2 w-16 h-16 bg-transparent rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg border border-[#FFD700]/20"
              style={{ backdropFilter: 'blur(2px)' }}
            >
              <span className="w-16 h-16 rounded-full flex items-center justify-center">
                <ChevronRight className="w-7 h-7 text-[#FFD700]" />
              </span>
            </button>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-6 h-6 ${
                      i < Math.floor(testimonials[currentTestimonial].rating)
                        ? "text-[#FFD700]"
                        : "text-gray-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-xl text-gray-300 mb-6 italic">
                "{testimonials[currentTestimonial].comment}"
              </p>
              <p className="text-accent font-semibold">
                {testimonials[currentTestimonial].name}
              </p>

              <div className="mt-8 flex items-center justify-center gap-4">
                <a href="/contact" className="cta-primary px-6 py-3"> <Star className="w-5 h-5 inline-block mr-2" /> Laisser un avis</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-100 text-center mb-12">Questions <span className="text-accent">Fréquentes</span></h2>

          <Accordion items={faqItems} autoScroll={true} singleOpen={true} />
        </div>
      </section>

  <section className="py-20 bg-app">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-100 text-center mb-12">
            Notre <span className="text-accent">Emplacement</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-video rounded-2xl overflow-hidden border border-[#FFD700]/20">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2522.601439371975!2d4.345018115736257!3d50.82842877953009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3c5f3a3b6d1b7%3A0x1234567890abcdef!2sRue%20de%20Merode%20174%2C%201000%20Saint-Gilles%2C%20Belgique!5e0!3m2!1sfr!2s!4v1697180000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
            <div>
              <div className="flex items-start gap-4 mb-6">
                  <MapPin className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold text-gray-100 mb-2">
                    Entrepôt Principal
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                      Notre entrepôt principal est situé à <span className="text-accent">Rue de Merode 174,
                    Saint-Gilles, Bruxelles</span>, Belgique. Nous assurons des
                    expéditions vers toute l'Europe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
