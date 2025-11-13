import { useEffect, useState, useRef } from 'react';
import { useSeo } from '../lib/seo';
import { useToasts } from '../components/Toast';
import { ArrowLeft } from 'lucide-react';

function useQuery() {
  return new URLSearchParams(window.location.search);
}

export default function AdminReset() {
  useSeo('France Parts | Réinitialisation du mot de passe', 'Réinitialisation du mot de passe administrateur pour France Parts. Suivez les instructions envoyées par email.');
  const q = useQuery();
  const [email, setEmail] = useState(q.get('email') || '');
  const [token, setToken] = useState(q.get('token') || '');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { push } = useToasts();
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordsMatch = (a: string, b: string) => a === b || a.trim() === b.trim();
  // toasts handle auto-dismiss; no local timers needed

  useEffect(() => {
    // keep inputs in sync if URL changes
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      setEmail(params.get('email') || '');
      setToken(params.get('token') || '');
    };
    window.addEventListener('popstate', onPop);
    // autofocus password field when token present
    if (token && passwordRef.current) passwordRef.current.focus();
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Auto-hide requestMessage, error and message after a few seconds
  // no local timers; toasts will auto-dismiss

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // clear any inline states if present; show toasts for feedback
    if (!email || !token || !password || !confirmPassword) {
      push({ type: 'error', message: "Veuillez fournir l'email, le token et le nouveau mot de passe (et sa confirmation)." });
      return;
    }

    // Password strength: min 8, at least one uppercase letter and one number
    const strengthRe = /(?=.*[A-Z])(?=.*\d).{8,}/;
    if (!strengthRe.test(password)) {
      push({ type: 'error', message: "Le mot de passe doit comporter au moins 8 caractères, inclure une majuscule et un chiffre." });
      setPassword(''); setConfirmPassword(''); setPasswordTouched(false); setConfirmTouched(false);
      passwordRef.current?.focus();
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      push({ type: 'error', message: "Les mots de passe ne correspondent pas." });
      // focus confirm field to help the user
      setConfirmPassword(''); setConfirmTouched(true);
      confirmRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      // send a trimmed password to avoid accidental leading/trailing spaces
      const cleanPassword = password.trim();
      const resp = await fetch('/api/admin-confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: cleanPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        push({ type: 'error', message: data?.error || 'Erreur serveur' });
        // clear passwords on failure to be safe
        setPassword(''); setConfirmPassword(''); setPasswordTouched(false); setConfirmTouched(false);
      } else {
        // clear fields on success
        setPassword(''); setConfirmPassword(''); setPasswordTouched(false); setConfirmTouched(false);
        push({ type: 'success', message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
        // redirect to /admin after short delay so the Admin component re-reads stored password
        setTimeout(() => { window.location.href = '/admin'; }, 1200);
      }
    } catch (err: any) {
      console.error('admin reset error', err);
      push({ type: 'error', message: 'Erreur réseau. Vérifiez la console pour plus de détails.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToken = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // use toasts for user feedback
  if (!email) { push({ type: 'error', message: 'Veuillez renseigner votre adresse email.' }); setEmailValid(false); emailRef.current?.focus(); return; }
    // quick client-side email format check
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) { push({ type: 'error', message: 'Adresse email invalide' }); setEmailValid(false); emailRef.current?.focus(); return; }
    setSending(true);
    try {
      // Directly request a reset; the server returns 404 if no admin exists for that email.
      const resp = await fetch('/api/admin-request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // If server returns 404 we know there is no admin for that email
      if (resp.status === 404) {
        push({ type: 'error', message: "Aucun compte administrateur n'est associé à cette adresse." });
        setEmailValid(false);
        emailRef.current?.focus();
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.ok) {
        setEmailValid(true);
        push({ type: 'success', message: 'Un lien de réinitialisation a été envoyé à cette adresse. Vérifiez votre boîte de réception et le dossier Spam.' });
      } else {
        push({ type: 'error', message: 'Impossible d\'envoyer l\'email pour le moment.' });
      }
    } catch (err: any) {
      console.error('request token error', err);
      push({ type: 'error', message: 'Erreur réseau. Vérifiez la console pour plus de détails.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 shadow">
         {/* link to return to login page */}
        <div className="mb-2">
          <a href="/admin" className=" gap-2 text-gray-400 hover:text-yellow-500">
            <ArrowLeft className="w-6 h-6" />
          </a>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-center text-yellow-500">Réinitialiser le mot de passe administrateur</h2>
        

        {/* global toasts will show success / error messages */}

        {/* If no token in URL, show the request-token form first */}
        {!token ? (
          <form onSubmit={handleRequestToken} className="space-y-3">
            <label className="block mb-2 text-sm text-gray-300">Adresse email</label>
            <input ref={emailRef} value={email} onChange={(e) => { setEmail(e.target.value); setEmailValid(null); }} type="email" className={`w-full px-4 py-3 bg-gray-900 rounded-lg text-gray-100 transition-all border ${emailValid === false ? 'border-red-500 focus:ring-2 focus:ring-red-400' : 'border-gray-700 focus:ring-2 focus:ring-yellow-500'}`} placeholder="Entrez votre email" required />

            <div className="flex gap-3">
              <button type="submit" disabled={sending} className="bg-yellow-500 text-black px-4 py-2 rounded font-semibold">{sending ? 'Envoi...' : 'Demander le lien'}</button>
              <a href="/admin" className="bg-gray-600 px-4 py-2 rounded text-white">Annuler</a>
            </div> 

            {/* toasts will display request feedback */}
            <div className="text-sm text-gray-400">
                Un lien de réinitialisation sera envoyé à cette adresse, s'il vous plaît vérifiez votre boîte de réception ou le dossier Spam.
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-sm text-gray-300">Ceci est votre adresse email : <span className="font-medium text-gray-100">{email}</span></div>

            <label className="block mb-2 text-sm text-gray-300">Nouveau mot de passe</label>
            <input
              ref={passwordRef}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
              onBlur={() => setPasswordTouched(true)}
              type="password"
              placeholder="Nouveau mot de passe"
              required
              className={`w-full px-4 py-3 bg-gray-900 rounded-lg text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all mb-2 ${passwordTouched && /(?=.*[A-Z])(?=.*\d).{8,}/.test(password) ? 'border border-green-400' : passwordTouched ? 'border border-red-500' : 'border border-gray-700'}`}
            />
            {passwordTouched && (
              <div className={`text-sm mb-3 ${/(?=.*[A-Z])(?=.*\d).{8,}/.test(password) ? 'text-green-400' : 'text-red-400'}`}>
                Au moins 8 caractères, une lettre majuscule et un chiffre.
              </div>
            )}

            <label className="block mb-2 text-sm text-gray-300">Confirmer le mot de passe</label>
            <input
              ref={confirmRef}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true); }}
              onBlur={() => setConfirmTouched(true)}
              type="password"
              placeholder="Confirmer le mot de passe"
              required
              className={`w-full px-4 py-3 bg-gray-900 rounded-lg text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all mb-2 ${confirmTouched && passwordsMatch(confirmPassword, password) ? 'border border-green-400' : confirmTouched ? 'border border-red-500' : 'border border-gray-700'}`}
            />
              {confirmTouched && (
                <div className={`text-sm mb-3 ${passwordsMatch(confirmPassword, password) ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordsMatch(confirmPassword, password) ? 'Les mots de passe correspondent.' : "Les mots de passe ne correspondent pas."}
                </div>
              )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !/(?=.*[A-Z])(?=.*\d).{8,}/.test(password) || !passwordsMatch(password, confirmPassword)}
                className="bg-yellow-500 text-black px-4 py-2 rounded font-semibold disabled:opacity-50"
              >
                {loading ? 'En cours...' : 'Valider'}
              </button>
              <a href="/admin" className="bg-gray-600 px-4 py-2 rounded text-white">Annuler</a>
            </div>
          </form>
        )}
       
      </div>
    </div>
  );
}
