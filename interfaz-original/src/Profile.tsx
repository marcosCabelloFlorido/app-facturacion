import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Check, Eye, EyeOff, LockKeyhole, Camera, X, Pencil, Save } from 'lucide-react';
import { labels, type User } from '../shared/domain';
import { passwordRules } from '../shared/profile';
import { api } from './api';
import { ErrorBox, Field, Modal, PanelHeading, type Notify } from './components';
import './profile.css';

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const id = useId();
  const capsId = id + '-caps';
  const detect = (event: KeyboardEvent<HTMLInputElement>) =>
    setCaps(event.getModifierState('CapsLock'));
  return (
    <div className="field profile-password-field">
      <label htmlFor={id}>{label}</label>
      <div className="profile-password-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          required
          maxLength={128}
          aria-invalid={!!error}
          aria-describedby={
            [caps ? capsId : '', error ? id + '-error' : ''].filter(Boolean).join(' ') || undefined
          }
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={detect}
          onKeyUp={detect}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="icon-button icon-button-plain"
          aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {caps && (
        <small id={capsId} role="status">
          Bloq Mayús activado
        </small>
      )}
      {error && (
        <small id={id + '-error'} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

function ChangePassword({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const valid =
    !!current &&
    password.length <= 128 &&
    passwordRules.every((rule) => rule.test(password)) &&
    password === confirmation;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword: current, password, confirmation },
      });
      onClose();
      notify('Contraseña actualizada. Las demás sesiones se han cerrado.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Cambiar contraseña"
      className="profile-password-modal"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="settings-password-form profile-password-form" onSubmit={save}>
        {error && <ErrorBox>{error}</ErrorBox>}
        <fieldset disabled={busy}>
          <PasswordField
            label="Contraseña actual"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
          <PasswordField
            label="Nueva contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <ul className="profile-password-rules" aria-label="Requisitos de la contraseña">
            {passwordRules.map((rule) => (
              <li key={rule.label} data-valid={rule.test(password)}>
                {rule.test(password) ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">·</span>
                )}
                <span>{rule.label}</span>
                <span className="sr-only">
                  {rule.test(password) ? ': cumplido' : ': pendiente'}
                </span>
              </li>
            ))}
          </ul>
          <PasswordField
            label="Confirmar contraseña"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
            error={
              confirmation && confirmation !== password
                ? 'Las contraseñas no coinciden.'
                : undefined
            }
          />
        </fieldset>
        <div className="modal-actions">
          <button type="submit" className="button primary" disabled={busy || !valid}>
            <Check size={16} />
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProfile({
  user,
  onRefresh,
  notify,
  onClose,
}: {
  user: User;
  onRefresh: () => Promise<void>;
  notify: Notify;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname || '');
  const [secondSurname, setSecondSurname] = useState(user.secondSurname || '');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const formId = useId();
  const changed =
    name.trim() !== user.name ||
    surname.trim() !== (user.surname || '') ||
    secondSurname.trim() !== (user.secondSurname || '') ||
    avatar !== (user.avatar || null);
  async function photo(file?: File) {
    if (!file) return;
    setError('');
    setPhotoBusy(true);
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error('Selecciona una imagen PNG, JPG o WebP de hasta 5 MB.');
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d')!;
      const size = Math.min(bitmap.width, bitmap.height);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 256, 256);
      context.drawImage(
        bitmap,
        (bitmap.width - size) / 2,
        (bitmap.height - size) / 2,
        size,
        size,
        0,
        0,
        256,
        256,
      );
      bitmap.close();
      setAvatar(canvas.toDataURL('image/jpeg', 0.85));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPhotoBusy(false);
      if (upload.current) upload.current.value = '';
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving.current || photoBusy || !changed || name.trim().length < 2) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/profile', {
        method: 'PUT',
        body: {
          name: name.trim(),
          surname: surname.trim(),
          secondSurname: secondSurname.trim(),
          avatar,
        },
      });
      await onRefresh();
      onClose();
      notify('Perfil actualizado.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Editar perfil"
      className="profile-edit-modal"
      onClose={() => {
        if (!busy && !photoBusy) onClose();
      }}
    >
      {error && <ErrorBox>{error}</ErrorBox>}
      <form id={formId} onSubmit={save} className="profile-form">
        <div className="profile-photo-row">
          <span className="profile-avatar">
            {avatar ? (
              <img src={avatar} alt="Foto de perfil" />
            ) : (
              user.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <input
            ref={upload}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            aria-label="Seleccionar foto de perfil"
            onChange={(event) => void photo(event.target.files?.[0])}
          />
          <button
            type="button"
            className="button"
            disabled={busy || photoBusy}
            onClick={() => upload.current?.click()}
          >
            <Camera size={17} />
            {photoBusy ? 'Preparando foto…' : 'Cambiar foto'}
          </button>
          {avatar && (
            <button
              type="button"
              className="icon-button icon-button-plain"
              aria-label="Quitar foto"
              disabled={busy || photoBusy}
              onClick={() => setAvatar(null)}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <Field label="Nombre">
          <input
            required
            minLength={2}
            maxLength={160}
            autoComplete="given-name"
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Primer apellido">
          <input
            maxLength={160}
            autoComplete="family-name"
            value={surname}
            disabled={busy}
            onChange={(event) => setSurname(event.target.value)}
          />
        </Field>
        <Field label="Segundo apellido">
          <input
            maxLength={160}
            value={secondSurname}
            disabled={busy}
            onChange={(event) => setSecondSurname(event.target.value)}
          />
        </Field>
        {changed && (
          <div className="modal-actions profile-save-actions">
            <button
              type="submit"
              className="button primary"
              aria-busy={busy}
              disabled={busy || photoBusy || name.trim().length < 2}
            >
              <Save size={17} aria-hidden="true" />
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}

export function Profile({
  user,
  onRefresh,
  notify,
}: {
  user: User;
  onRefresh: () => Promise<void>;
  notify: Notify;
}) {
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  return (
    <section className="panel profile-section">
      <PanelHeading
        title="Perfil"
        action={
          <button
            type="button"
            className="icon-button icon-button-plain"
            aria-label="Editar perfil"
            title="Editar perfil"
            onClick={() => setEditing(true)}
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
        }
      />
      <div className="profile-summary">
        <span className="profile-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt="Foto de perfil" />
          ) : (
            user.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div>
          <p className="profile-identity">
            {[user.name, user.surname, user.secondSurname].filter(Boolean).join(' ')}{' '}
            <span aria-hidden="true">·</span> <span>{labels[user.role]}</span>
          </p>
          <p className="profile-address">{user.email}</p>
        </div>
      </div>
      <button type="button" className="button" onClick={() => setPasswordOpen(true)}>
        <LockKeyhole size={17} />
        Cambiar contraseña
      </button>
      {editing && (
        <EditProfile
          user={user}
          onRefresh={onRefresh}
          notify={notify}
          onClose={() => setEditing(false)}
        />
      )}
      {passwordOpen && <ChangePassword onClose={() => setPasswordOpen(false)} notify={notify} />}
    </section>
  );
}
