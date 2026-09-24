import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search } from 'lucide-react';
import {
  dniLengthError,
  exceedsDniInput,
  invalidNifSearch,
  isValidNif,
  nifError,
  nifSchema,
} from '../shared/nif';
import {
  contactLabels,
  canSearchContacts,
  contactParty,
  normalizeTaxId,
  type Contact,
} from '../shared/contacts';
import type { DocumentInput } from '../shared/domain';
import { api } from './api';
import { ErrorBox, Field, Modal } from './components';
import { ContactForm } from './ContactPicker';
import './contacts.css';

type Party = DocumentInput['party'];
const completeNif = isValidNif;

// FUENTE: kit 06-input.md (buscador) y 16-modal.md; adaptación en SISTEMA_VISUAL.md.
export function ContactPicker({
  party,
  onSelect,
  type = 'customer',
  disabled = false,
  error,
  onResolved,
  allowContactType = false,
  showSelection = true,
  salesFlow = false,
}: {
  party: Party;
  onSelect: (party: Party) => void;
  type?: 'customer' | 'supplier';
  disabled?: boolean;
  error?: string;
  onResolved?: (contact: Contact) => void;
  allowContactType?: boolean;
  showSelection?: boolean;
  salesFlow?: boolean;
}) {
  const [found, setFound] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [modalError, setModalError] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [salesQuery, setSalesQuery] = useState(party.taxId);
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const suggestionRequest = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const lastLookup = useRef('');
  const saving = useRef(false);
  const selected = !!(party.name && party.address);
  const label = type === 'supplier' ? 'proveedor' : 'cliente';
  useEffect(() => () => request.current?.abort(), []);

  function closeSuggestions() {
    suggestionRequest.current?.abort();
    setSearchTerm(null);
    setSuggestionsOpen(false);
    setSuggestionsLoading(false);
    setSuggestions([]);
    setHasMore(false);
    setActiveIndex(-1);
  }

  function showContact(contact: Contact) {
    if (!isValidNif(contact.taxId)) {
      closeSuggestions();
      setLookupError('La ficha tiene un NIF incorrecto. Corrígelo en Clientes y proveedores.');
      return;
    }
    if (salesFlow && contact.active) {
      choose(contact);
      return;
    }
    closeSuggestions();
    lastLookup.current = contact.taxId;
    onSelect({ ...party, taxId: contact.taxId });
    setModalError('');
    setFound(contact);
  }

  useEffect(() => {
    if (!searchTerm || !canSearchContacts(searchTerm) || disabled) return;
    if (invalidNifSearch(searchTerm)) {
      closeSuggestions();
      setLookupError(nifError);
      return;
    }
    const controller = new AbortController();
    suggestionRequest.current = controller;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await api<{ rows: Contact[]; hasMore: boolean }>(
          '/contacts/suggestions?' +
            (salesFlow ? 'search=' : 'taxId=') +
            encodeURIComponent(searchTerm),
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setSuggestions(result.rows);
        setHasMore(result.hasMore);
        setSuggestionsOpen(true);
        setActiveIndex(-1);
        const exact = result.rows.find((contact) => contact.taxId === normalizeTaxId(searchTerm));
        if (exact) showContact(exact);
        else if (!result.rows.length && completeNif(normalizeTaxId(searchTerm))) {
          onSelect({ name: '', taxId: normalizeTaxId(searchTerm), address: '', email: '' });
          lastLookup.current = searchTerm;
          closeSuggestions();
          setCreating(true);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setLookupError((e as Error).message);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, disabled, salesFlow]);

  useEffect(() => {
    if (activeIndex >= 0)
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId]);

  async function lookup(force = false) {
    if (disabled || saving.current || request.current) return;
    const query = salesFlow ? salesQuery : party.taxId;
    if (invalidNifSearch(query)) {
      closeSuggestions();
      setLookupError(nifError);
      return;
    }
    if (!canSearchContacts(query)) {
      closeSuggestions();
      return;
    }
    if (
      salesFlow &&
      !completeNif(normalizeTaxId(salesQuery)) &&
      !/^[A-Z]{2}[A-Z0-9]{6,28}$/i.test(salesQuery.trim())
    ) {
      setLookupError('');
      setSearchTerm(salesQuery.trim() || null);
      return;
    }
    closeSuggestions();
    const parsed = nifSchema.safeParse(salesFlow ? salesQuery : party.taxId);
    if (!parsed.success) {
      setLookupError(nifError);
      return;
    }
    if (!force && (lastLookup.current === parsed.data || selected)) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setLookupError('');
    setModalError('');
    try {
      const result = await api<{ contact: Contact | null }>(
        '/contacts/lookup?taxId=' + encodeURIComponent(parsed.data),
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      lastLookup.current = parsed.data;
      if (result.contact) showContact(result.contact);
      else {
        if (salesFlow) onSelect({ name: '', taxId: parsed.data, address: '', email: '' });
        setCreating(true);
      }
    } catch (e) {
      if (!controller.signal.aborted) setLookupError((e as Error).message);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function choose(contact: Contact) {
    closeSuggestions();
    lastLookup.current = contact.taxId;
    setSalesQuery(contact.taxId);
    onSelect(contactParty(contact));
    setFound(null);
    setCreating(false);
    onResolved?.(contact);
  }

  async function confirmContact() {
    if (!found || saving.current || disabled) return;
    saving.current = true;
    setBusy(true);
    setModalError('');
    try {
      const contact = found.active
        ? found
        : await api<Contact>(`/contacts/${found.id}/status`, {
            method: 'PUT',
            body: { active: true, version: found.version },
          });
      choose(contact);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="contact-picker">
      <div className="contact-nif-control">
        <Field
          className={salesFlow ? 'field-label-hidden' : ''}
          label={
            salesFlow
              ? 'Nombre o NIF del ' + label
              : type === 'supplier'
                ? 'NIF del proveedor'
                : 'NIF del cliente'
          }
          error={lookupError || error}
        >
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls={suggestionsOpen ? listId : undefined}
            aria-activedescendant={
              suggestionsOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            required
            maxLength={salesFlow ? 160 : 30}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={salesFlow ? 'Nombre o NIF' : 'NIF de la empresa'}
            value={salesFlow ? salesQuery : party.taxId}
            disabled={disabled}
            onFocus={() => {
              const query = salesFlow ? salesQuery : normalizeTaxId(party.taxId);
              if (!selected && normalizeTaxId(query) !== lastLookup.current)
                setSearchTerm(canSearchContacts(query) ? query.trim() : null);
            }}
            onChange={(e) => {
              const value = e.target.value;
              if (exceedsDniInput(value)) {
                closeSuggestions();
                setLookupError(dniLengthError);
                return;
              }
              setLookupError('');
              if (salesFlow) {
                setSalesQuery(value);
                request.current?.abort();
                request.current = null;
                setBusy(false);
                lastLookup.current = '';
                closeSuggestions();
                setSearchTerm(canSearchContacts(value) ? value.trim() : null);
                onSelect({
                  name: '',
                  taxId: completeNif(normalizeTaxId(value)) ? normalizeTaxId(value) : '',
                  address: '',
                  email: '',
                });
                return;
              }
              const normalized = normalizeTaxId(value);
              const sameIdentity = normalized === normalizeTaxId(party.taxId);
              if (!sameIdentity) {
                request.current?.abort();
                request.current = null;
                setBusy(false);
                lastLookup.current = '';
                closeSuggestions();
                setSearchTerm(canSearchContacts(normalized) ? normalized : null);
              }
              onSelect(
                sameIdentity
                  ? { ...party, taxId: value }
                  : { name: '', taxId: value, address: '', email: '' },
              );
            }}
            onBlur={(e) => {
              if (e.relatedTarget instanceof Element && e.relatedTarget.closest('.contact-picker'))
                return;
              const partialMatch = suggestions.length > 0;
              closeSuggestions();
              if (completeNif(normalizeTaxId(party.taxId)) && !partialMatch) void lookup();
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Escape' && (suggestionsOpen || searchTerm)) {
                e.preventDefault();
                e.stopPropagation();
                closeSuggestions();
                return;
              }
              if (
                suggestionsOpen &&
                suggestions.length &&
                ['ArrowDown', 'ArrowUp'].includes(e.key)
              ) {
                e.preventDefault();
                setActiveIndex((index) =>
                  e.key === 'ArrowDown'
                    ? (index + 1) % suggestions.length
                    : (index <= 0 ? suggestions.length : index) - 1,
                );
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (suggestionsOpen && activeIndex >= 0) showContact(suggestions[activeIndex]);
                else if (salesFlow && suggestionsOpen && suggestions.length === 1)
                  showContact(suggestions[0]);
                else void lookup(true);
              }
            }}
          />
        </Field>
        <button
          type="button"
          className="icon-button contact-nif-search"
          aria-label={salesFlow ? 'Buscar ' + label : `Consultar NIF del ${label}`}
          title={salesFlow ? 'Buscar ' + label : 'Consultar NIF'}
          disabled={disabled || busy || !canSearchContacts(salesFlow ? salesQuery : party.taxId)}
          onClick={() => void lookup(true)}
        >
          <Search size={18} />
        </button>
        {suggestionsOpen && (
          <div className="contact-nif-suggestions">
            <ul
              id={listId}
              role="listbox"
              aria-label={
                salesFlow
                  ? (type === 'supplier' ? 'Proveedores' : 'Clientes') + ' por nombre o NIF'
                  : type === 'supplier'
                    ? 'Proveedores por NIF'
                    : 'Clientes por NIF'
              }
            >
              {suggestions.map((contact, index) => (
                <li
                  key={contact.id}
                  id={`${listId}-${index}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => showContact(contact)}
                >
                  <strong>{contact.name}</strong>
                  <span>
                    {contact.taxId}
                    {!contact.active && ' · Archivado'}
                  </span>
                </li>
              ))}
            </ul>
            {!suggestions.length && (
              <div>
                <p role="status">Sin coincidencias. Completa el NIF para crear la ficha.</p>
                {salesFlow && (
                  <button
                    type="button"
                    className="button ghost"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      closeSuggestions();
                      setCreating(true);
                    }}
                  >
                    Añadir {label}
                  </button>
                )}
              </div>
            )}
            {hasMore && <p>Escribe más caracteres para concretar la búsqueda.</p>}
          </div>
        )}
      </div>
      {(busy || suggestionsLoading) && !found && (
        <p className="contact-hint" role="status">
          Consultando NIF…
        </p>
      )}
      {selected && showSelection && (
        <div
          className="contact-nif-selected"
          role="status"
          aria-label={type === 'supplier' ? 'Proveedor seleccionado' : 'Cliente seleccionado'}
          aria-atomic="true"
        >
          <Check size={16} strokeWidth={1.6} aria-hidden="true" />
          <span>{party.name}</span>
        </div>
      )}
      {found &&
        createPortal(
          <Modal
            title={`${type === 'supplier' ? 'Proveedor' : 'Cliente'} encontrado`}
            description={!found.active ? 'Ficha archivada.' : undefined}
            onClose={() => {
              if (!saving.current) setFound(null);
            }}
          >
            <dl className="contact-nif-summary">
              <div>
                <dt>Nombre o razón social</dt>
                <dd>{found.name}</dd>
              </div>
              <div>
                <dt>NIF</dt>
                <dd>{found.taxId}</dd>
              </div>
              <div>
                <dt>Dirección fiscal</dt>
                <dd>{found.address}</dd>
              </div>
              {found.email && (
                <div>
                  <dt>Correo electrónico</dt>
                  <dd>{found.email}</dd>
                </div>
              )}
              {found.phone && (
                <div>
                  <dt>Teléfono</dt>
                  <dd>{found.phone}</dd>
                </div>
              )}
              <div>
                <dt>Tipo de ficha</dt>
                <dd>{contactLabels[found.type]}</dd>
              </div>
            </dl>
            {modalError && <ErrorBox>{modalError}</ErrorBox>}
            <div className="modal-actions">
              <button
                type="button"
                className="button primary"
                disabled={busy || disabled}
                onClick={() => void confirmContact()}
              >
                {busy ? 'Guardando…' : found.active ? 'Usar estos datos' : 'Recuperar y usar'}
              </button>
            </div>
          </Modal>,
          document.body,
        )}
      {creating && (
        <ContactForm
          initial={{ ...party, taxId: normalizeTaxId(party.taxId), type }}
          lookupCreation
          fixedType={allowContactType ? undefined : type}
          onClose={() => setCreating(false)}
          onSaved={choose}
        />
      )}
    </div>
  );
}
