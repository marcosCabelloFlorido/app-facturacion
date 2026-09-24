import kronjopLogo from './assets/kronjop-logo-white.png';
import { useState, type FormEvent } from 'react';
import { ArrowRight, FileText, Sparkles, Store, Wallet } from 'lucide-react';
import { api } from './api';
import { SpiralAnimation } from './components/ui/spiral-animation';
import { ErrorBox, Field, Submit } from './components';
import type { Company } from '../shared/domain';
import './auth.css';
export function Auth({ setup, onSuccess }: { setup: boolean; onSuccess: () => void }) {
  const [now] = useState(() => new Date());
  const hour = now.getHours();
  const morning = hour >= 6 && hour < 14;
  const afternoon = hour >= 14 && hour < 21;
  const greeting = morning ? 'Buenos días.' : afternoon ? 'Buenas tardes.' : 'Buenas noches.';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [company, setCompany] = useState<Company>({
    name: '',
    taxId: '',
    address: '',
    email: '',
    iban: '',
    phone: '',
    website: '',
    paymentTerms: 'Pago mediante transferencia bancaria.',
    currency: 'EUR',
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(setup ? '/auth/setup' : '/auth/login', {
        method: 'POST',
        body: setup ? { name, email, password, company, demo } : { email, password },
      });
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-brand">
        <div className="brand">
          <img className="auth-official-logo" src={kronjopLogo} alt="Kronjop" />
        </div>
        <div className="auth-intro">
          <h2>
            Tu negocio,
            <br />
            en un mismo lugar.
          </h2>
          <ul className="auth-features">
            <li>
              <FileText size={19} aria-hidden="true" />
              <div>
                <strong>De presupuesto a factura</strong>
              </div>
            </li>
            <li>
              <Wallet size={19} aria-hidden="true" />
              <div>
                <strong>Cobros y gastos a la vista</strong>
              </div>
            </li>
            <li>
              <Store size={19} aria-hidden="true" />
              <div>
                <strong>Un espacio para cada negocio</strong>
              </div>
            </li>
          </ul>
        </div>
        <SpiralAnimation />
      </aside>
      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-welcome">
            <p className="auth-greeting">{greeting}</p>
          </div>
          <h1>{setup ? 'Configura tu empresa' : 'Iniciar sesión'}</h1>
          {error && <ErrorBox>{error}</ErrorBox>}
          {setup && (
            <>
              <button
                type="button"
                className={`demo-button ${demo ? 'selected' : ''}`}
                onClick={() => {
                  setDemo(true);
                  setCompany({
                    ...company,
                    name: 'Estudio Horizonte · DEMO',
                    taxId: 'DEMO-HORIZONTE',
                    address: 'Calle de Ejemplo, 24 · 28001 Madrid',
                    email: 'estudio@example.com',
                  });
                }}
              >
                <Sparkles size={18} />
                <span>
                  <strong>
                    {demo
                      ? 'Empresa de demostración seleccionada'
                      : 'Explorar con datos de demostración'}
                  </strong>
                  <small>Seis meses de actividad ficticia para probar la app.</small>
                </span>
                <ArrowRight size={17} />
              </button>
              <div className="form-grid">
                <Field label="Tu nombre">
                  <input
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Razón social">
                  <input
                    required
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  />
                </Field>
                <Field label="NIF / identificador fiscal">
                  <input
                    required
                    value={company.taxId}
                    onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                  />
                </Field>
                <Field label="Dirección fiscal">
                  <input
                    required
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  />
                </Field>
              </div>
            </>
          )}
          <Field label="Correo electrónico">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
            />
          </Field>
          <Field label="Contraseña" hint={setup ? 'Utiliza al menos 10 caracteres.' : undefined}>
            <input
              type="password"
              autoComplete={setup ? 'new-password' : 'current-password'}
              minLength={10}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduce tu contraseña"
            />
          </Field>
          <Submit busy={busy}>{setup ? 'Crear espacio de trabajo' : 'Iniciar sesión'}</Submit>
        </form>
      </main>
    </div>
  );
}
