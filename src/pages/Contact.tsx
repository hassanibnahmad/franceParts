import { useState } from "react";
import { MapPin, Phone, Mail, Send } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // send the contact to the server (will be stored so admin can view it)
    (async () => {
      try {
        const resp = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          throw new Error(j?.error || 'Erreur lors de l\'envoi');
        }
        setSubmitted(true);
        setFormData({ nom: '', email: '', telephone: '', message: '' });
      } catch (err) {
        console.error('contact submit error', err);
        alert('Impossible d\'envoyer le message. Réessayez plus tard.');
      }
    })();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Téléphone",
      value: "+32 497 02 58 06",
      link: "tel:+32497025806",
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      value: "doctrot@outlook.be",
      link: "mailto:doctrot@outlook.be",
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Localisation",
      value: "Rue de Mérode 174 Saint Gilles, Bruxelles, Belgique",
      link: "https://maps.app.goo.gl/PPXJgh24DwxUHmVg6",
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="bg-gradient-to-br from-black to-gray-900 py-24 bg-squares">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1
            data-aos="fade-up"
            className="text-5xl md:text-6xl font-bold text-gray-100 mb-6"
          >
            <span className="text-yellow-500">Contactez-<span className="text-gray-100">nous</span></span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Notre équipe est à votre écoute pour répondre à toutes vos questions
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div
            data-aos="fade-up"
            data-aos-duration="3500"
            className="bg-gray-800 rounded-xl shadow-xl p-8"
          >
            <h2
              data-aos="fade-up"
              className="text-3xl font-bold text-gray-100 mb-8"
            >
              Envoyez-nous un message
            </h2>

            {submitted ? (
              <div className="mb-6 p-6 bg-green-900 border border-green-700 rounded-lg text-green-100 text-center animate-fade-in">
                <div className="flex flex-col items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-green-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-semibold text-lg">OK — Message envoyé</p>
                  <p className="text-sm text-green-100">Merci, nous vous répondrons sous peu.</p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/5 text-white"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ nom: "", email: "", telephone: "", message: "" });
                    }}
                  >
                    Envoyer un autre message
                  </button>
                </div>
              </div>
            ) : null}

            {!submitted && (
              <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="nom"
                  className="block text-gray-200 font-medium mb-2"
                >
                  Nom complet *
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#2b2b2b] placeholder-gray-400 border border-gray-600 rounded-lg focus:border-[#FFD700] transition-colors duration-200 bg-transparent"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-gray-200 font-medium mb-2"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#2b2b2b] placeholder-gray-400 border border-gray-600 rounded-lg focus:border-[#FFD700] transition-colors duration-200 bg-transparent"
                  placeholder="doctrot@outlook.be"
                />
              </div>

              <div>
                <label
                  htmlFor="telephone"
                  className="block text-gray-200 font-medium mb-2"
                >
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2b2b2b] placeholder-gray-400 border border-gray-600 rounded-lg focus:border-[#FFD700] transition-colors duration-200 bg-transparent"
                  placeholder="+32 497 02 58 06"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-gray-200 font-medium mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-[#2b2b2b] placeholder-gray-400 border border-gray-600 rounded-lg focus:border-[#FFD700] transition-colors duration-200 resize-none bg-transparent"
                  placeholder="Décrivez votre besoin..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 text-black font-bold py-4 rounded-lg hover:bg-yellow-400 transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span>Envoyer</span>
                <Send className="w-5 h-5" />
              </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div
              data-aos="fade-up"
              data-aos-duration="3500"
              className="bg-gray-800 rounded-xl shadow-xl p-8"
            >
              <h2 className="text-3xl font-bold text-gray-100 mb-6">
                Nos Coordonnées
              </h2>
              <div className="space-y-6 mb-6">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.link}
                    className="flex items-start p-6 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-yellow-400/30 hover:bg-gray-800/70 transition-all duration-300 group"
                  >
                    <div className="text-yellow-400 group-hover:text-yellow-300 mr-4 flex-shrink-0">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {info.title}
                      </h3>
                      <p className="text-gray-300 group-hover:text-white transition-colors ">
                        {info.value}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Hours */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Horaires d'ouverture
                </h3>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Lun - Ven</span>
                    <span>9h00 - 18h00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Samedi</span>
                    <span>9h00 - 16h00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dimanche</span>
                    <span className="text-red-400">Fermé</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-black to-gray-900 rounded-xl shadow-xl p-8 text-gray-100">
                <h3 className="text-2xl font-bold mb-4">
                  Besoin d'aide urgente ?
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Contactez-nous directement via WhatsApp pour une réponse
                  rapide
                </p>
                <a
                  href="https://wa.me/32497025806"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-green-500 text-gray-100 px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-all duration-300 hover:scale-105"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="rounded-xl overflow-hidden shadow-2xl h-96">
          <iframe
            // saint grilles, brussels, belgium map
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2519.486973486263!2d4.350978316034329!3d50.83321397953092!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3c380e6f5b6b5%3A0xbee5d8e8e6f5e6d1!2sRue%20de%20M%C3%A9rode%20174%2C%201060%20Saint-Gilles%2C%20Belgique!5e0!3m2!1sfr!2sbe!4v1701301234567"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
