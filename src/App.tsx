import logoImg from './assets/logo.png';
import carBg from './assets/image.png';

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-black via-surface to-black overflow-hidden">
        <div className="absolute top-20 left-0 w-full flex justify-center pointer-events-none">
          <div className="w-full max-w-6xl h-24 md:h-28 lg:h-32"></div>
        </div>
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-50"
          style={{ backgroundImage: `url(${carBg})` }}
        ></div>
        {/* dark overlay to ensure image fits dark theme */}
        <div className="absolute inset-0 bg-black/60"></div>

        <div className="relative z-20 flex items-center justify-center px-4">
          <div className="flex items-center w-full max-w-xl p-6 rounded-lg border border-orange-600 bg-orange-950 shadow-2xl">
            <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-orange-400 bg-orange-900/50 rounded-full mr-4">
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-100">Ce site est actuellement indisponible. Merci de contacter le développeur afin d'en rétablir l'accès. 
                <a href="https://wa.me/212646426335" 
                 className='text-green-400 underline cursor-pointer'> +212 646-426335
                 </a>
              </p>
            </div>
              
            <img src={logoImg} alt="Close" className='w-10 h-10' />
           
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
