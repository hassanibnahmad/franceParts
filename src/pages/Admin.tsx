import { useState, useEffect } from 'react';
import type { BlogPost } from '../lib/supabase';
import { listPosts, createPost, updatePost, deletePost } from '../lib/blogs';
import { Plus, Edit2, Trash2, Eye, EyeOff, LogOut, X, Check } from 'lucide-react';

type PricingItem = {
  service: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
};

const DEFAULT_PRICING: PricingItem[] = [
  { service: 'Diagnostic rapide', price: '29€', description: 'Diagnostic électronique complet de votre véhicule', features: ['Lecture des codes défaut', 'Rapport détaillé', 'Conseils de réparation', 'Durée: 30 minutes'] },
  { service: "Pièce d'occasion", price: 'À partir de 15€', description: "Pièces d'occasion vérifiées et garanties", features: ['Pièces testées', 'Garantie 6 mois', 'Large choix', 'Disponibilité immédiate'], popular: true },
  { service: 'Pièce neuve', price: 'À partir de 49€', description: "Pièces neuves d'origine constructeur", features: ["Pièces d'origine", 'Garantie constructeur', 'Commande rapide', 'Livraison possible'] },
  { service: 'Entretien complet', price: '149€', description: 'Révision complète de votre véhicule', features: ['Vidange + filtre', 'Contrôle freins', 'Contrôle suspension', 'Rapport détaillé'] },
  { service: 'Expertise véhicule', price: '89€', description: 'Analyse approfondie de l\'état de votre véhicule avant achat ou vente', features: ['Contrôle technique', 'Rapport détaillé', 'Évaluation prix', 'Conseils d\'expert'] },
  { service: 'Commande de pièces', price: 'Sur devis', description: 'Recherche et commande de pièces spécifiques pour véhicules français', features: ['Recherche sur mesure', 'Délai garanti', 'Toutes marques', 'Suivi de commande'] }
];

export default function Admin() {
  // simple auth gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // posts state (uses provided blog helpers)
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({ title: '', slug: '', excerpt: '', content: '', featured_image: '', author: 'France Parts', published: false });

  useEffect(() => { if (isAuthenticated) fetchPosts(); }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password === '123123') setIsAuthenticated(true); else alert('Mot de passe incorrect'); };

  const fetchPosts = async () => {
    try { const data = await listPosts(); setPosts(data); } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await updatePost(editingPost.id as string, { ...formData, updated_at: new Date().toISOString() });
      } else {
        await createPost(formData);
      }
      fetchPosts();
      resetForm();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => { if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return; try { await deletePost(id); fetchPosts(); } catch (e) { console.error(e); } };

  const handleEdit = (post: BlogPost) => { setEditingPost(post); setFormData({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, featured_image: post.featured_image, author: post.author, published: post.published }); setShowForm(true); };

  const togglePublished = async (post: BlogPost) => { try { await updatePost(post.id as string, { published: !post.published }); fetchPosts(); } catch (e) { console.error(e); } };

  const resetForm = () => { setFormData({ title: '', slug: '', excerpt: '', content: '', featured_image: '', author: 'France Parts', published: false }); setEditingPost(null); setShowForm(false); };

  // tabs
  const [activeTab, setActiveTab] = useState<'posts' | 'pricing'>('posts');

  // Pricing local CRUD
  const [pricingData, setPricingData] = useState<PricingItem[]>(() => {
    try { const raw = localStorage.getItem('pricingData'); return raw ? JSON.parse(raw) : DEFAULT_PRICING; } catch (e) { return DEFAULT_PRICING; }
  });
  useEffect(() => { try { localStorage.setItem('pricingData', JSON.stringify(pricingData)); } catch (e) { /* ignore */ } }, [pricingData]);

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPricingIndex, setEditingPricingIndex] = useState<number | null>(null);
  const [pricingForm, setPricingForm] = useState<{ service: string; price: string; description: string; featuresText: string; popular: boolean }>({ service: '', price: '', description: '', featuresText: '', popular: false });
  const [pricingErrors, setPricingErrors] = useState<{ service?: string; price?: string; featuresText?: string }>({});

  const openPricingAdd = () => { setEditingPricingIndex(null); setPricingForm({ service: '', price: '', description: '', featuresText: '', popular: false }); setIsPricingModalOpen(true); };
  const openPricingEdit = (index: number) => { const item = pricingData[index]; setEditingPricingIndex(index); setPricingForm({ service: item.service, price: item.price, description: item.description, featuresText: (item.features || []).join('\n'), popular: !!item.popular }); setIsPricingModalOpen(true); };

  const savePricingForm = () => {
    const errors: { service?: string; price?: string; featuresText?: string } = {};
    if (!pricingForm.service.trim()) errors.service = 'Le nom du service est requis.';
    if (!pricingForm.price.trim()) errors.price = 'Le prix est requis.';
    if (!pricingForm.featuresText.trim()) errors.featuresText = 'Ajoutez au moins une caractéristique (une par ligne).';
    setPricingErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const newItem: PricingItem = { service: pricingForm.service || 'Untitled', price: pricingForm.price || '-', description: pricingForm.description || '', features: pricingForm.featuresText.split('\n').map(s => s.trim()).filter(Boolean), popular: !!pricingForm.popular };
    if (editingPricingIndex === null) setPricingData(prev => [newItem, ...prev]); else setPricingData(prev => prev.map((it, i) => i === editingPricingIndex ? newItem : it));
    setIsPricingModalOpen(false);
  };

  useEffect(() => {
    if (!isPricingModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsPricingModalOpen(false); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => { const el = document.querySelector('#pricing-service') as HTMLInputElement | null; el?.focus(); el?.select(); }, 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isPricingModalOpen]);

  const removePricing = (index: number) => { if (!confirm('Supprimer ce tarif ?')) return; setPricingData(prev => prev.filter((_, i) => i !== index)); };
  const resetPricing = () => { if (!confirm('Réinitialiser les tarifs par défaut ?')) return; localStorage.removeItem('pricingData'); setPricingData(DEFAULT_PRICING); };

  // render
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-yellow-500/20">
          <h1 className="text-3xl font-bold text-gray-100 mb-2 text-center">Administration</h1>
          <p className="text-gray-400 text-center mb-8">France Parts Dashboard</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-yellow-500 font-medium mb-2">Mot de passe</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" placeholder="Entrez votre mot de passe" required />
            </div>
            <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition-all duration-300 hover:scale-105">Se connecter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-100">Dashboard <span className="text-yellow-500">Admin</span></h1>
          <button onClick={() => setIsAuthenticated(false)} className="flex items-center space-x-2 bg-red-500 text-gray-100 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"><LogOut className="w-4 h-4" /><span>Déconnexion</span></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <aside className="md:col-span-3 hidden md:block">
            <div className="sticky top-28 space-y-4">
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <button onClick={() => setActiveTab('posts')} className={`w-full text-left px-4 py-2 rounded-md mb-2 ${activeTab === 'posts' ? 'bg-yellow-500 text-black' : 'text-gray-200 bg-gray-800'}`}>Articles</button>
                <button onClick={() => setActiveTab('pricing')} className={`w-full text-left px-4 py-2 rounded-md ${activeTab === 'pricing' ? 'bg-yellow-500 text-black' : 'text-gray-200 bg-gray-800'}`}>Tarifs</button>
              </div>

              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-sm text-gray-300">
                <div className="mb-2 font-semibold">Liens rapides</div>
                <a href="/" className="block hover:text-yellow-500">Voir le site public</a>
                <a href="/contact" className="block mt-1 hover:text-yellow-500">Contact</a>
              </div>
            </div>
          </aside>

          <main className="md:col-span-9">
            <div className="mb-6 flex gap-3 md:hidden">
              <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded ${activeTab === 'posts' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-200'}`}>Articles</button>
              <button onClick={() => setActiveTab('pricing')} className={`px-4 py-2 rounded ${activeTab === 'pricing' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-200'}`}>Tarifs</button>
            </div>

            {activeTab === 'posts' ? (
              showForm ? (
                <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-100">{editingPost ? 'Modifier l\'article' : 'Nouvel article'}</h2>
                    <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-100 transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-yellow-500 font-medium mb-2">Titre *</label>
                      <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" required />
                    </div>
                    {/* additional post fields can be added here */}
                  </form>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-all duration-300 hover:scale-105 mb-8"><Plus className="w-5 h-5" /><span>Nouvel article</span></button>

                  <div className="grid gap-6">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-yellow-500 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-100">{post.title}</h3>
                              {post.published ? (<span className="bg-green-500 text-gray-100 text-xs px-2 py-1 rounded">Publié</span>) : (<span className="bg-gray-600 text-gray-100 text-xs px-2 py-1 rounded">Brouillon</span>)}
                            </div>
                            <p className="text-gray-400 text-sm mb-3">{post.excerpt}</p>
                            <div className="text-gray-500 text-xs">Par {post.author} • {new Date(post.created_at).toLocaleDateString('fr-FR')}</div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <button onClick={() => togglePublished(post)} className="p-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors" title={post.published ? 'Dépublier' : 'Publier'}>{post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            <button onClick={() => handleEdit(post)} className="p-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(post.id)} className="p-2 bg-red-500 text-gray-100 rounded-lg hover:bg-red-600 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {posts.length === 0 && (<div className="text-center py-12 text-gray-400">Aucun article. Créez votre premier article !</div>)}
                  </div>
                </>
              )
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-100">Gestion des Tarifs</h2>
                  <div className="flex gap-3">
                    <button onClick={openPricingAdd} className="inline-flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold shadow hover:bg-yellow-400"><Plus className="w-4 h-4" />Ajouter</button>
                    <button onClick={resetPricing} className="px-3 py-2 bg-red-600 text-white rounded-md">Réinitialiser</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                  {pricingData.map((item, index) => (
                    <div key={index} className={`bg-gray-800 rounded-xl shadow-xl p-8 relative ${item.popular ? 'border-4 border-yellow-500' : 'border border-gray-700'}`}>
                      {item.popular && (<div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><span className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm shadow-lg">Plus populaire</span></div>)}
                      <div className="absolute top-4 right-4 flex gap-2"><button onClick={() => openPricingEdit(index)} className="p-2 bg-gray-900/60 hover:bg-gray-900 text-yellow-400 rounded-md"><Edit2 className="w-4 h-4" /></button><button onClick={() => removePricing(index)} className="p-2 bg-red-700/60 hover:bg-red-700 text-white rounded-md"><Trash2 className="w-4 h-4" /></button></div>
                      <div className="text-center mb-6"><h3 className="text-2xl font-bold text-gray-100 mb-2">{item.service}</h3><p className="text-gray-300 text-sm mb-4">{item.description}</p><div className="text-4xl font-bold text-yellow-500">{item.price}</div></div>
                      <ul className="space-y-4 mb-8">{item.features.map((f, idx) => (<li key={idx} className="flex items-start text-gray-300"><Check className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />{f}</li>))}</ul>
                      <div className="flex gap-3"><button onClick={() => openPricingEdit(index)} className="flex-1 bg-gray-900 text-yellow-500 rounded-lg py-2">Modifier</button><button onClick={() => removePricing(index)} className="flex-1 bg-red-700 text-white rounded-lg py-2">Supprimer</button></div>
                    </div>
                  ))}
                </div>

                {isPricingModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4">
                      <h3 className="text-xl font-bold mb-4 text-gray-100">{editingPricingIndex === null ? 'Ajouter un tarif' : 'Modifier un tarif'}</h3>
                      <div className="grid gap-3">
                        <div>
                          <input id="pricing-service" value={pricingForm.service} onChange={(e) => setPricingForm({ ...pricingForm, service: e.target.value })} className="bg-gray-800 text-gray-100 px-3 py-2 rounded-md border border-gray-700 w-full" placeholder="Service" />
                          {pricingErrors.service && <div className="text-sm text-red-400 mt-1">{pricingErrors.service}</div>}
                        </div>
                        <div>
                          <input value={pricingForm.price} onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })} className="bg-gray-800 text-gray-100 px-3 py-2 rounded-md border border-gray-700 w-full" placeholder="Prix (ex: 49€)" />
                          {pricingErrors.price && <div className="text-sm text-red-400 mt-1">{pricingErrors.price}</div>}
                        </div>
                        <div>
                          <textarea value={pricingForm.description} onChange={(e) => setPricingForm({ ...pricingForm, description: e.target.value })} className="bg-gray-800 text-gray-100 px-3 py-2 rounded-md border border-gray-700 w-full" placeholder="Description courte" rows={2} />
                        </div>
                        <div>
                          <textarea value={pricingForm.featuresText} onChange={(e) => setPricingForm({ ...pricingForm, featuresText: e.target.value })} className="bg-gray-800 text-gray-100 px-3 py-2 rounded-md border border-gray-700 w-full" placeholder="Caractéristiques — une par ligne" rows={4} />
                          {pricingErrors.featuresText && <div className="text-sm text-red-400 mt-1">{pricingErrors.featuresText}</div>}
                        </div>
                        <label className="flex items-center gap-2 text-gray-100"><input type="checkbox" checked={pricingForm.popular} onChange={(e) => setPricingForm({ ...pricingForm, popular: e.target.checked })} />Marquer comme populaire</label>
                      </div>
                      <div className="mt-4 flex justify-end gap-3"><button onClick={() => setIsPricingModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-200 rounded">Annuler</button>
                      <button onClick={savePricingForm} disabled={!pricingForm.service.trim() || !pricingForm.price.trim() || !pricingForm.featuresText.trim()} className={`px-4 py-2 rounded font-semibold ${(!pricingForm.service.trim() || !pricingForm.price.trim() || !pricingForm.featuresText.trim()) ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-yellow-500 text-black'}`}>Enregistrer</button></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
