import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToasts } from '../components/Toast';
import type { BlogPost } from '../lib/supabase';
import { listPosts } from '../lib/blogs';
import BlogForm from '../components/BlogForm';
import { Plus, Edit2, Trash2, Eye, EyeOff, LogOut, Check, Home, User, KeyRound, MailQuestionMark } from 'lucide-react';
import { supabase } from '../lib/supabase';
 

type PricingItem = {
  id?: string;
  service: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  created_at?: string;
};


// ModalPortal: small helper to render modal content into a dedicated DOM node
// It handles focus trapping and Escape-to-close, and restores focus on unmount.
function ModalPortal({ name, onClose,  children }: any) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (!containerRef.current) containerRef.current = document.createElement('div');

  useEffect(() => {
    const el = containerRef.current!;
    el.setAttribute('data-portal-modal', name || 'modal');
    document.body.appendChild(el);
    return () => {
      try { document.body.removeChild(el); } catch (e) { /* ignore */ }
    };
  }, [name]);

  // keep a stable ref to the latest onClose so we don't re-run this effect on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const el = containerRef.current!;
    const prevActive = document.activeElement as HTMLElement | null;

    const focusableSelector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      const first = el.querySelector(focusableSelector) as HTMLElement | null;
      if (first) first.focus();
    };

    const t = setTimeout(focusFirst, 10);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(el.querySelectorAll(focusableSelector)) as HTMLElement[];
        if (nodes.length === 0) { e.preventDefault(); return; }
        const idx = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (idx <= 0) { nodes[nodes.length - 1].focus(); e.preventDefault(); }
        } else {
          if (idx === -1 || idx === nodes.length - 1) { nodes[0].focus(); e.preventDefault(); }
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      try { if (prevActive) (prevActive as HTMLElement).focus(); } catch (e) { /* ignore */ }
    };
  }, []);

  return createPortal(children, containerRef.current!);
}

export default function Admin() {
  // simple auth gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const { push } = useToasts();

  // On mount, remove any previously stored admin password (do not persist secrets)
  useEffect(() => {
    try { localStorage.removeItem('admin_password'); } catch (e) { /* ignore */ }
  }, []);

  // admin password is stored in localStorage for this demo so the reset flow can update it.
  // We'll read it at login time so changes take effect immediately.

  // Password reset is now handled on the dedicated `/admin/reset` page.

  // posts state (uses provided blog helpers)
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  // post form state is handled inside BlogForm component now
  // Change password / email modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [changeEmailPassword, setChangeEmailPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // profile dropdown state & refs
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  

  // close profile menu on outside click or Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = profileMenuRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setShowProfileMenu(false);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowProfileMenu(false);
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onDocKey); };
  }, []);

  useEffect(() => { if (isAuthenticated) fetchPosts(); }, [isAuthenticated]);

  // contacts state and fetch
  const [contacts, setContacts] = useState<any[]>([]);
  const fetchContacts = async () => {
    try {
  const resp = await fetch('/api/contacts', { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load');
      const json = await resp.json().catch(() => ({}));
      setContacts(json?.data || []);
    } catch (e) { console.error('fetchContacts error', e); setContacts([]); }
  };

  useEffect(() => { if (isAuthenticated) fetchContacts(); }, [isAuthenticated]);

  const deleteContact = (id: string) => {
    openConfirm('Supprimer ce message ?', 'Supprimer le message', async () => {
      try {
  const resp = await fetch(`/api/contacts/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
        if (!resp.ok) throw new Error('Delete failed');
        setContacts(prev => prev.filter(c => String(c.id) !== String(id)));
        push({ type: 'success', message: 'Message supprimé.' });
      } catch (e) {
        console.error('deleteContact error', e);
        push({ type: 'error', message: 'Impossible de supprimer le message.' });
      }
    }, 'Supprimer');
  };

  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !password.trim()) { push({ type: 'error', message: 'Veuillez saisir le mot de passe administrateur.' }); return; }
    try {
  const resp = await fetch('/api/admin-login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error === 'invalid_credentials' ? 'Mot de passe incorrect.' : (data?.error || 'Erreur serveur');
        push({ type: 'error', message: msg });
        return;
      }
      // Save only the admin email as a local hint (do NOT store password)
  try { if (data?.email) setAdminEmail(data.email); } catch (e) { /* ignore */ }
      setIsAuthenticated(true);
      // request a short-lived upload token from the server (server issues it only for authenticated sessions)
      try {
  const tResp = await fetch('/api/admin-token', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (tResp.ok) {
          const tData = await tResp.json().catch(() => ({}));
          if (tData?.token) setUploadToken(tData.token);
        }
      } catch (e) { /* ignore */ }
      push({ type: 'success', message: 'Connexion réussie.' });
    } catch (err: any) {
      // Keep technical details in the console only; show a generic error to the user
      console.error('login error', err);
      push({ type: 'error', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  };

    

  // Save new password (server-backed): call API endpoint
  const saveNewPassword = async () => {
    const adminEmailLocal = adminEmail;
    if (!adminEmailLocal) { push({ type: 'error', message: 'Email administrateur introuvable. Assurez-vous d’être connecté.' }); return; }
    if (newPassword.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      push({ type: 'error', message: 'Le mot de passe doit avoir au moins 8 caractères, une majuscule et un chiffre.' });
      return;
    }
    if (newPassword !== confirmNewPassword) { push({ type: 'error', message: 'La confirmation ne correspond pas.' }); return; }
    try {
  const resp = await fetch('/api/admin-change-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminEmailLocal, current_password: oldPassword, new_password: newPassword }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error || (resp.status === 403 ? 'Ancien mot de passe incorrect.' : 'Erreur serveur');
        push({ type: 'error', message: msg });
        return;
      }
      setShowChangePassword(false);
      setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
      push({ type: 'success', message: 'Mot de passe mis à jour.' });
    } catch (err: any) {
      console.error('saveNewPassword error', err);
      push({ type: 'error', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  };

  // Save new email (server-backed): call API endpoint and require current password
  const saveNewEmail = async () => {
    const adminEmailLocal = adminEmail;
    if (!adminEmailLocal) { push({ type: 'error', message: 'Email administrateur introuvable. Assurez-vous d’être connecté.' }); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(newEmail)) { push({ type: 'error', message: 'Email invalide.' }); return; }
    if (newEmail !== confirmEmail) { push({ type: 'error', message: 'Les emails ne correspondent pas.' }); return; }
    if (!changeEmailPassword) { push({ type: 'error', message: 'Veuillez saisir votre mot de passe actuel pour confirmer.' }); return; }
    try {
  const resp = await fetch('/api/admin-change-email', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: adminEmail, current_password: changeEmailPassword, new_email: newEmail }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.error === 'email_taken' ? 'Cet email est déjà utilisé.' : (data?.error || 'Erreur serveur');
        push({ type: 'error', message: msg });
        return;
      }
  // Update local admin email state (do not store password or secrets in localStorage)
  try { setAdminEmail(newEmail); } catch (e) { /* ignore */ }
      setShowChangeEmail(false);
      setNewEmail(''); setConfirmEmail(''); setChangeEmailPassword('');
      push({ type: 'success', message: 'Email administrateur mis à jour.' });
    } catch (err: any) {
      console.error('saveNewEmail error', err);
      push({ type: 'error', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  };

  const fetchPosts = async () => {
    try { const data = await listPosts(); setPosts(data); } catch (e) { console.error(e); }
  };

  // inline form removed — BlogForm component handles submit and calls handleSavePost

  const handleSavePost = async (post: Partial<BlogPost>) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (uploadToken) headers['x-upload-token'] = uploadToken;

      if (editingPost) {
        // Fallback: send update as POST with _action when PUT may be blocked by CDN/routing
        const payload = { _action: 'update', id: editingPost.id, ...post, updated_at: new Date().toISOString() };
        const resp = await fetch('/api/posts', { method: 'POST', headers, body: JSON.stringify(payload), credentials: 'include' });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Update failed');
        push({ type: 'success', message: 'Article mis à jour.' });
      } else {
        const resp = await fetch('/api/posts', { method: 'POST', headers, body: JSON.stringify(post), credentials: 'include' });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Create failed');
        push({ type: 'success', message: 'Article créé.' });
      }
      fetchPosts();
      resetForm();
    } catch (err) {
      console.error(err);
      push({ type: 'error', message: 'Erreur lors de la sauvegarde de l\'article.' });
    }
  };

  const handleDelete = (id: string) => {
    openConfirm('Êtes-vous sûr de vouloir supprimer cet article ?', 'Supprimer l\'article', async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (uploadToken) headers['x-upload-token'] = uploadToken;
  // Fallback: use POST with _action to delete when DELETE is blocked by CDN/routing
        const resp = await fetch('/api/posts', { method: 'POST', headers, body: JSON.stringify({ _action: 'delete', id }), credentials: 'include' });
        if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Delete failed');
        fetchPosts();
        push({ type: 'success', message: 'Article supprimé.' });
      } catch (e) { console.error(e); push({ type: 'error', message: 'Erreur lors de la suppression de l\'article.' }); }
    }, 'Supprimer');
  };

  const handleEdit = (post: BlogPost) => { setEditingPost(post); setShowForm(true); };

  const togglePublished = async (post: BlogPost) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (uploadToken) headers['x-upload-token'] = uploadToken;
      const resp = await fetch(`/api/posts/${post.id}`, { method: 'PUT', headers, body: JSON.stringify({ published: !post.published }), credentials: 'include' });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Update failed');
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => { setEditingPost(null); setShowForm(false); };

  // tabs
  const [activeTab, setActiveTab] = useState<'posts' | 'pricing' | 'contacts'>('posts');

  // Pricing CRUD now done via secure server endpoints
  const [pricingData, setPricingData] = useState<PricingItem[]>([]);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPricingIndex, setEditingPricingIndex] = useState<number | null>(null);
  const [editingPricingId, setEditingPricingId] = useState<string | null>(null);
  const [pricingForm, setPricingForm] = useState<{ service: string; price: string; description: string; featuresText: string; popular: boolean }>({ service: '', price: '', description: '', featuresText: '', popular: false });
  const [pricingErrors, setPricingErrors] = useState<{ service?: string; price?: string; featuresText?: string }>({});
  // Confirm modal state (replaces window.confirm)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmActionLabel, setConfirmActionLabel] = useState<string>('Confirmer');
  const confirmActionRef = useRef<(() => Promise<void>) | null>(null);

  const openConfirm = (message: string, title: string | null, action: () => Promise<void>, actionLabel = 'Confirmer') => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmActionLabel(actionLabel);
    confirmActionRef.current = action;
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTitle(null);
    setConfirmMessage(null);
    confirmActionRef.current = null;
  };

  const proceedConfirm = async () => {
    // close UI first, then run action
    setConfirmOpen(false);
    try {
      if (confirmActionRef.current) await confirmActionRef.current();
    } catch (e) {
      console.error('confirm action error', e);
    } finally {
      closeConfirm();
    }
  };

  // load tarifs from secure server endpoint on admin mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/tarifs');
        if (resp.status === 404) {
          // endpoint not present — try direct Supabase fallback
          try {
            const { data, error } = await supabase.from('tarifs').select('*').order('created_at', { ascending: true });
            if (!error && data) {
              const mapped: PricingItem[] = (data as any[]).map(r => ({ id: r.id, service: r.service, price: r.price, description: r.description, features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features || '[]') : []), popular: !!r.popular, created_at: r.created_at }));
              if (!cancelled) setPricingData(mapped || []);
              return;
            }
          } catch (err) {
            console.warn('Supabase fallback failed', err);
          }
          if (!cancelled) setPricingData([]);
          return;
        }
        if (!resp.ok) {
          // other non-OK status
          console.warn('Failed to load /api/tarifs:', resp.status);
          if (!cancelled) setPricingData([]);
          return;
        }
        const json = await resp.json().catch(() => ({}));
        const data = json?.data || [];
        const mapped: PricingItem[] = (data as any[]).map(r => ({ id: r.id, service: r.service, price: r.price, description: r.description, features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features || '[]') : []), popular: !!r.popular, created_at: r.created_at }));
        if (!cancelled) setPricingData(mapped || []);
      } catch (e) {
        console.warn('Error fetching tarifs', e);
        if (!cancelled) setPricingData([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openPricingAdd = () => { setEditingPricingIndex(null); setEditingPricingId(null); setPricingForm({ service: '', price: '', description: '', featuresText: '', popular: false }); setIsPricingModalOpen(true); };
  const openPricingEdit = (index: number) => { const item = pricingData[index]; setEditingPricingIndex(index); setEditingPricingId(item?.id ?? null); setPricingForm({ service: item.service, price: item.price, description: item.description, featuresText: (item.features || []).join('\n'), popular: !!item.popular }); setIsPricingModalOpen(true); };

  const savePricingForm = () => {
    const errors: { service?: string; price?: string; featuresText?: string } = {};
    if (!pricingForm.service.trim()) errors.service = 'Le nom du service est requis.';
    if (!pricingForm.price.trim()) errors.price = 'Le prix est requis.';
    if (!pricingForm.featuresText.trim()) errors.featuresText = 'Ajoutez au moins une caractéristique (une par ligne).';
    setPricingErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const newItem: PricingItem = { service: pricingForm.service || 'Untitled', price: pricingForm.price || '-', description: pricingForm.description || '', features: pricingForm.featuresText.split('\n').map(s => s.trim()).filter(Boolean), popular: !!pricingForm.popular };

    (async () => {
      try {
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (uploadToken) headers['x-upload-token'] = uploadToken;

        if (editingPricingId) {
          const resp = await fetch(`/api/tarifs/${encodeURIComponent(editingPricingId)}`, { method: 'PUT', headers, body: JSON.stringify({ service: newItem.service, price: newItem.price, description: newItem.description, features: newItem.features, popular: newItem.popular }) });
          if (resp.status === 404) {
            push({ type: 'error', message: 'API tarifs indisponible.' });
            return;
          }
          if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Update failed');
          const json = await resp.json().catch(() => ({}));
          const d = json?.data || null;
          setPricingData(prev => prev.map(p => p.id === editingPricingId ? ({ ...(p || {}), ...(d || {}) } as PricingItem) : p));
          push({ type: 'success', message: 'Tarif mis à jour.' });
        } else {
          const resp = await fetch('/api/tarifs', { method: 'POST', headers, body: JSON.stringify({ service: newItem.service, price: newItem.price, description: newItem.description, features: newItem.features, popular: newItem.popular }) });
          if (resp.status === 404) {
            push({ type: 'error', message: 'API tarifs indisponible.' });
            return;
          }
          if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Create failed');
          const json = await resp.json().catch(() => ({}));
          const d = json?.data || null;
          setPricingData(prev => d ? [d as any as PricingItem, ...prev] : prev);
          push({ type: 'success', message: 'Tarif créé.' });
        }
      } catch (e) {
        console.error('savePricingForm error', e);
        push({ type: 'error', message: 'Erreur lors de la sauvegarde du tarif.' });
      } finally {
        setIsPricingModalOpen(false);
        setEditingPricingId(null);
        setEditingPricingIndex(null);
      }
    })();
  };

  // resetPricing removed — seeding should be done via migrations or server tooling

  const removePricing = (index: number) => {
    openConfirm('Supprimer ce tarif ?', 'Supprimer le tarif', async () => {
      try {
        const id = pricingData[index]?.id;
        if (!id) {
          setPricingData(prev => prev.filter((_, i) => i !== index));
          return;
        }
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (uploadToken) headers['x-upload-token'] = uploadToken;
          const resp = await fetch(`/api/tarifs/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
          if (resp.status === 404) {
            // endpoint missing — remove locally and consider it success
            setPricingData(prev => prev.filter((_, i) => i !== index));
            push({ type: 'success', message: 'Tarif supprimé (mode hors-ligne).' });
            return;
          }
          if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || 'Delete failed');
        setPricingData(prev => prev.filter((_, i) => i !== index));
        push({ type: 'success', message: 'Tarif supprimé.' });
      } catch (e) {
        console.error('removePricing error', e);
        push({ type: 'error', message: 'Erreur lors de la suppression du tarif.' });
      }
    }, 'Supprimer');
  };

  useEffect(() => {
    if (!isPricingModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsPricingModalOpen(false); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => { const el = document.querySelector('#pricing-service') as HTMLInputElement | null; el?.focus(); el?.select(); }, 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isPricingModalOpen]);

  // cleanup: removed temporary debug portals/overlays and highlighting logic
  

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-yellow-500 mb-4 text-center">Espace administrateur</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Mot de passe administrateur</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-900 text-gray-100 border border-gray-700" />
            </div>
            <div className="flex justify-between items-center">
              <button type="submit" disabled={!password.trim()} className={`px-4 py-2 rounded font-semibold ${!password.trim() ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-yellow-500 text-black'}`}>Se connecter</button>
              <a href="/" className="text-sm text-gray-400 hover:text-yellow-500 inline-flex items-center gap-2"><Home className="w-4 h-4" />Retour</a>
            </div>
            <div className="flex justify-center items-center">
              <a href="/admin/reset" className="text-sm text-gray-400 hover:text-yellow-500 text-center">Mot de passe oublié ?</a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-14 pb-12">
  {/* debug badge removed in cleanup */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminModalsFallback
          showChangePassword={showChangePassword}
          setShowChangePassword={setShowChangePassword}
          oldPassword={oldPassword}
          setOldPassword={setOldPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmNewPassword={confirmNewPassword}
          setConfirmNewPassword={setConfirmNewPassword}
          saveNewPassword={saveNewPassword}
          showChangeEmail={showChangeEmail}
          setShowChangeEmail={setShowChangeEmail}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          confirmEmail={confirmEmail}
          setConfirmEmail={setConfirmEmail}
          changeEmailPassword={changeEmailPassword}
          setChangeEmailPassword={setChangeEmailPassword}
          saveNewEmail={saveNewEmail}
          adminEmail={adminEmail}
        />
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard <span className="text-yellow-500">Admin</span></h1>
                <p className="small-muted mt-1">Manage articles and pricing</p>
              </div>

              {/* Profile Dropdown (moved to header) */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-800 rounded-lg hover:bg-gray-700 "
                >
                  <User />
                </button>

                {showProfileMenu && (
                  <div role="menu" aria-labelledby="profile-button" className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                    <button role="menuitem" className="flex items-center justify-cente w-full text-left px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700" onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}>
                          <KeyRound className="w-4 h-4 mr-2" /> Changer mot de passe
                    </button>
                    <button role="menuitem" className="flex items-center justify-cente w-full text-left px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700" onClick={() => { setShowProfileMenu(false); setShowChangeEmail(true); }}>
                      <MailQuestionMark className="w-4 h-4 mr-2" /> Changer email
                    </button>
                    <div className="border-t border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        try { localStorage.clear(); } catch (e) { /* ignore */ }
                        window.location.reload();
                      }}
                      className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-400 bg-gray-800 hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-12">
          <aside className="md:col-span-3 hidden md:block bg-transparent border-r border-gray-700 px-4">
            <div className="sticky top-14 space-y-4">
              <div className="pt-8">
                <div className="px-4 py-3">
                  <button onClick={() => setActiveTab('posts')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-md mb-2 ${activeTab === 'posts' ? 'bg-gray-700 text-white outline-none' : 'text-white bg-transparent outline-none hover:bg-gray-800 hover:text-yellow-500'}`}>
                    <span>Articles</span>
                  </button>
                  <button onClick={() => setActiveTab('pricing')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-md ${activeTab === 'pricing' ? 'bg-gray-700 text-white outline-none' : 'text-white bg-transparent outline-none  hover:bg-gray-800 hover:text-yellow-500'}`}>
                    <span>Tarifs</span>
                  </button>
                  <button onClick={() => setActiveTab('contacts')} className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-md ${activeTab === 'contacts' ? 'bg-gray-700 text-white outline-none' : 'text-white bg-transparent outline-none  hover:bg-gray-800 hover:text-yellow-500'}`}>
                    <span>Contacts</span>
                  </button>
                </div>
                <div className="border-t border-gray-700 my-1 mt-4" />
              <div className="mb-2 font-semibold text-gray-200 mt-4">Liens rapides</div>
                <a href="/" className="block text-sm text-blue-300 hover:underline" target="blank">Voir le site public</a>
              </div>
            </div>
          </aside>

          <main className="md:col-span-9 ">
            <div className="mb-6 flex gap-3 md:hidden">
              <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded ${activeTab === 'posts' ? 'bg-gray-700 text-black' : 'bg-gray-800 text-gray-200'}`}>Articles</button>
              <button onClick={() => setActiveTab('pricing')} className={`px-4 py-2 rounded ${activeTab === 'pricing' ? 'bg-gray-700 text-black' : 'bg-gray-800 text-gray-200'}`}>Tarifs</button>
              <button onClick={() => setActiveTab('contacts')} className={`px-4 py-2 rounded ${activeTab === 'contacts' ? 'bg-gray-700 text-black' : 'bg-gray-800 text-gray-200'}`}>Contacts</button>
            </div>

            {activeTab === 'contacts' ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-100">Messages de contact</h2>
                  <div className="text-sm text-gray-400">{contacts.length} message(s)</div>
                </div>

                <div className="space-y-4">
                  {contacts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">Aucun message reçu.</div>
                  ) : (
                    contacts.map((c) => (
                      <div key={c.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-100">{c.name} <span className="text-gray-400 text-sm">• {c.email}</span></h3>
                              <div className="text-gray-500 text-xs">{new Date(c.created_at).toLocaleString('fr-FR')}</div>
                            </div>
                            {c.phone && <div className="text-gray-400 text-sm mt-2">Téléphone: {c.phone}</div>}
                            <p className="text-gray-300 mt-3 whitespace-pre-wrap">{c.message}</p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button onClick={() => deleteContact(c.id)} className="p-2 bg-red-600 text-white rounded-md">Supprimer</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'posts' ? (
              showForm ? (
                <BlogForm
                  initial={editingPost ?? null}
                  onCancel={resetForm}
                  onSave={handleSavePost}
                  uploadToken={uploadToken}
                  submitLabel={editingPost ? 'Enregistrer les modifications' : 'Enregistrer'}
                />
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                  {pricingData.map((item, index) => (
                    <div key={index} className={`bg-gray-800 rounded-xl shadow-xl p-8 relative ${item.popular ? 'border-4 border-yellow-500' : 'border border-gray-700'}`}>
                      {item.popular && (<div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><span className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-sm xs:text-xs  shadow-lg">Plus populaire</span></div>)}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => openPricingEdit(index)} className="p-2 bg-gray-900/60 hover:bg-gray-900 text-yellow-400 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => removePricing(index)} className="p-2 bg-red-700/60 hover:bg-red-700 text-white rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-100 mb-2">{item.service}</h3>
                        <p className="text-gray-300 text-sm mb-4">{item.description}</p>
                        <div className="text-4xl font-bold text-yellow-500">{item.price}</div>
                      </div>
                      <ul className="space-y-4 mb-8">{item.features.map((f, idx) => (<li key={idx} className="flex items-start text-gray-300"><Check className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />{f}</li>))}</ul>
                      <div className="flex gap-3">
                        <button onClick={() => openPricingEdit(index)} className="flex-1 bg-gray-900 text-yellow-500 rounded-lg py-2">Modifier</button>
                        <button onClick={() => removePricing(index)} className="flex-1 bg-red-700 text-white rounded-lg py-2">Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>

                {isPricingModalOpen && (
                  <ModalPortal name="pricing" onClose={() => setIsPricingModalOpen(false)} labelledBy="pricing-title">
                    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 portal-card">
                      <h3 id="pricing-title" className="text-xl font-bold mb-4 text-gray-100">{editingPricingIndex === null ? 'Ajouter un tarif' : 'Modifier un tarif'}</h3>
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
                  </ModalPortal>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      {/* Confirm modal (modern replacement for window.confirm) */}
      {confirmOpen && (
        <ModalPortal name="confirm" onClose={closeConfirm}>
          <div className="bg-gray-900 rounded-lg p-6 lg:w-1/2 sm:w-full mx-4  shadow-2xl portal-card slideUp" role="dialog" aria-modal="true">
            {confirmTitle && <h3 className="text-lg font-bold text-gray-100 mb-2">{confirmTitle}</h3>}
            {confirmMessage && <p className="text-gray-300 mb-4">{confirmMessage}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={closeConfirm} className="px-4 py-2 bg-gray-700 text-gray-200 rounded">Annuler</button>
              <button onClick={proceedConfirm} className="px-4 py-2 rounded font-semibold bg-red-600 text-white">{confirmActionLabel}</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

// NOTE: Render change-password and change-email portals outside of the activeTab branches
// so they are available regardless of which tab is active (this keeps header buttons working).
// These are functionally identical to the portal blocks inside the pricing branch but
// moved here to ensure they're mounted whenever their state is true.
export function AdminModalsFallback({
  showChangePassword,
  setShowChangePassword,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  saveNewPassword,
  showChangeEmail,
  setShowChangeEmail,
  newEmail,
  setNewEmail,
  confirmEmail,
  setConfirmEmail,
  changeEmailPassword,
  setChangeEmailPassword,
  saveNewEmail
  , adminEmail
}: any) {
  // These render into document.body so they are above app layout.
  return (
    <>
      {showChangePassword && (
        <ModalPortal name="change-password" onClose={() => { setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmNewPassword(''); }} labelledBy="change-password-title">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 ring-1 ring-yellow-400 shadow-2xl portal-card" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
            <h3 id="change-password-title" className="text-xl font-bold mb-4 text-gray-100">Changer le mot de passe</h3>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Ancien mot de passe</label>
                <input autoFocus type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-900 text-yellow-200 border border-yellow-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirmer le nouveau mot de passe</label>
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmNewPassword(''); }} className="px-4 py-2 bg-gray-700 text-gray-200 rounded">Annuler</button>
              <button onClick={saveNewPassword} className="px-4 py-2 rounded font-semibold bg-yellow-500 text-black">Enregistrer</button>
            </div>
          </div>
        </ModalPortal>
      )}

      {showChangeEmail && (
        <ModalPortal name="change-email" onClose={() => { setShowChangeEmail(false); setNewEmail(''); setConfirmEmail(''); setChangeEmailPassword(''); }} labelledBy="change-email-title">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 ring-1 ring-yellow-400 shadow-2xl portal-card" role="dialog" aria-modal="true" aria-labelledby="change-email-title">
            <h3 id="change-email-title" className="text-xl font-bold mb-4 text-gray-100">Changer l'email administrateur</h3>
            <div className="grid gap-3">
              {adminEmail && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email actuel</label>
                  <input type="text" value={adminEmail} disabled className="w-full px-3 py-2 rounded-md bg-gray-700 text-gray-300 border border-gray-700" />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nouvel email</label>
                <input autoFocus type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-900 text-yellow-200 border border-yellow-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirmer l'email</label>
                <input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Mot de passe actuel</label>
                <input type="password" value={changeEmailPassword} onChange={(e) => setChangeEmailPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowChangeEmail(false); setNewEmail(''); setConfirmEmail(''); setChangeEmailPassword(''); }} className="px-4 py-2 bg-gray-700 text-gray-200 rounded">Annuler</button>
              <button type="button" onClick={saveNewEmail} className="px-4 py-2 rounded font-semibold bg-yellow-500 text-black">Enregistrer</button>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
