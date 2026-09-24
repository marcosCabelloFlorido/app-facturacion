import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import {
  Autocomplete,
  Button,
  I18nProvider,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select as AriaSelect,
  SelectValue,
  useFilter,
} from 'react-aria-components';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { flushSync } from 'react-dom';

type Option = { id: string; value: string; text: string; disabled: boolean };
export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'> & {
  searchable?: boolean;
  placeholder?: string;
  triggerPrefix?: ReactNode;
  triggerLabel?: ReactNode;
  actions?: { label: string; onAction: () => void }[];
};

function optionText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join('');
}

function readOptions(children: ReactNode, parentDisabled = false): Option[] {
  const result: Option[] = [];
  Children.forEach(children, (child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        value?: string | number;
        disabled?: boolean;
        label?: string;
      }>(child)
    )
      return;
    if (child.type === Fragment || child.type === 'optgroup') {
      result.push(...readOptions(child.props.children, parentDisabled || !!child.props.disabled));
    } else if (child.type === 'option') {
      const text = child.props.label ?? optionText(child.props.children).trim();
      const value = String(child.props.value ?? text);
      result.push({
        id: 'value:' + value,
        value,
        text,
        disabled: parentDisabled || !!child.props.disabled,
      });
    }
  });
  return result;
}

/** Single-value selection. Native options and change events keep existing forms compatible. */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  className = '',
  style,
  id,
  disabled,
  required,
  searchable,
  placeholder,
  triggerPrefix,
  triggerLabel,
  actions,
  ...nativeProps
}: SelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const generatedId = useId();
  const errorId = generatedId + '-required';
  const options = readOptions(children);
  const initial = String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? '');
  const [uncontrolledValue, setUncontrolledValue] = useState(initial);
  const selected = String(value ?? uncontrolledValue);
  const [open, setOpen] = useState(false);
  const [nativeInvalid, setNativeInvalid] = useState(false);
  const [fieldsetDisabled, setFieldsetDisabled] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement>();
  const { contains } = useFilter({ sensitivity: 'base' });
  const isDisabled = !!disabled || fieldsetDisabled;
  const isInvalid =
    nativeInvalid || nativeProps['aria-invalid'] === true || nativeProps['aria-invalid'] === 'true';
  const withSearch = searchable ?? options.length >= 12;
  const describedBy =
    [
      nativeProps['aria-describedby'],
      required ? generatedId + '-required-hint' : '',
      nativeInvalid ? errorId : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  useEffect(() => {
    // Fixed portal inside the native dialog stays interactive and escapes its scrolling body.
    const dialog = root.current?.closest('dialog');
    if (!dialog) return;
    const layer = document.createElement('div');
    layer.className = 'app-select-layer';
    dialog.append(layer);
    setPortalContainer(layer);
    return () => layer.remove();
  }, []);

  useEffect(() => {
    const fieldsets: Element[] = [];
    let parent = root.current?.parentElement;
    while (parent) {
      if (parent.tagName === 'FIELDSET') fieldsets.push(parent);
      parent = parent.parentElement;
    }
    const update = () => setFieldsetDisabled(!!native.current?.matches(':disabled'));
    const observer = new MutationObserver(update);
    fieldsets.forEach((fieldset) =>
      observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] }),
    );
    update();
    return () => observer.disconnect();
  }, [disabled]);

  useEffect(() => {
    if (isDisabled) setOpen(false);
  }, [isDisabled]);

  useEffect(() => {
    // React Aria's button filters validation attributes; retain native field semantics.
    if (isInvalid) trigger.current?.setAttribute('aria-invalid', 'true');
    else trigger.current?.removeAttribute('aria-invalid');
  }, [isInvalid]);

  useEffect(() => {
    const form = native.current?.form;
    let resetFrame = 0;
    const reset = () => {
      if (value === undefined) setUncontrolledValue(initial);
      setNativeInvalid(false);
      // The browser resets native controls after the reset event has been dispatched.
      resetFrame = requestAnimationFrame(() => {
        if (native.current) native.current.value = String(value ?? initial);
      });
    };
    form?.addEventListener('reset', reset);
    return () => {
      form?.removeEventListener('reset', reset);
      cancelAnimationFrame(resetFrame);
    };
  }, [initial, value]);

  const list = (
    <ListBox
      className="app-select-list"
      items={options}
      renderEmptyState={() => (
        <div className="app-select-empty" role="status">
          {options.length ? 'No hay coincidencias' : 'No hay opciones disponibles'}
        </div>
      )}
    >
      {(option) => (
        <ListBoxItem
          id={option.id}
          textValue={option.text}
          isDisabled={option.disabled}
          className="app-select-option"
        >
          {({ isSelected }) => (
            <>
              <span>{option.text}</span>
              <Check
                size={16}
                aria-hidden="true"
                className={isSelected ? 'app-select-check' : 'app-select-check is-hidden'}
              />
            </>
          )}
        </ListBoxItem>
      )}
    </ListBox>
  );

  return (
    <I18nProvider locale="es-ES">
      <AriaSelect
        ref={root}
        className={`app-select ${className}`}
        style={style}
        value={'value:' + selected}
        isOpen={open}
        onOpenChange={setOpen}
        isDisabled={isDisabled}
        isRequired={required}
        isInvalid={isInvalid}
        validationBehavior="aria"
        allowsEmptyCollection
        aria-label={nativeProps['aria-label']}
        aria-labelledby={nativeProps['aria-labelledby']}
        aria-describedby={describedBy}
        placeholder={
          placeholder ?? (options.length ? 'Seleccionar…' : 'No hay opciones disponibles')
        }
        onChange={(key) => {
          const option = options.find((item) => item.id === key);
          if (!option || option.disabled || !native.current) return;
          // A genuine native change event preserves target/currentTarget and controlled resets.
          native.current.value = option.value;
          native.current.dispatchEvent(new Event('change', { bubbles: true }));
        }}
      >
        <Button
          ref={trigger}
          id={id}
          className="app-select-trigger"
          autoFocus={nativeProps.autoFocus}
          aria-invalid={isInvalid || undefined}
        >
          {triggerPrefix && (
            <span className="app-select-prefix" aria-hidden="true">
              {triggerPrefix}
            </span>
          )}
          <SelectValue className="app-select-value">
            {triggerLabel === undefined ? undefined : () => triggerLabel}
          </SelectValue>
          <ChevronDown size={16} className="app-select-chevron" aria-hidden="true" />
        </Button>
        <Popover
          className="app-select-popover"
          placement="bottom start"
          offset={6}
          containerPadding={12}
          maxHeight={320}
          shouldFlip
          UNSTABLE_portalContainer={portalContainer}
        >
          <div
            style={{ display: 'contents' }}
            onKeyDownCapture={(event) => {
              if (event.key !== 'Tab' && event.key !== 'Escape') return;
              if (event.key === 'Tab' && actions?.length) return;
              if (event.key === 'Escape') event.preventDefault();
              // Leave the selection control in document order, including Shift+Tab.
              event.stopPropagation();
              flushSync(() => setOpen(false));
              trigger.current?.focus();
            }}
          >
            {withSearch ? (
              <Autocomplete filter={contains}>
                <SearchField className="app-select-search" aria-label="Buscar opciones" autoFocus>
                  <Search size={16} aria-hidden="true" />
                  <Input placeholder="Buscar…" />
                </SearchField>
                {list}
              </Autocomplete>
            ) : (
              list
            )}
          </div>
          {!!actions?.length && (
            <div className="app-select-actions">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  className="app-select-action"
                  onPress={() => {
                    flushSync(() => setOpen(false));
                    trigger.current?.focus();
                    action.onAction();
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </Popover>
        <select
          {...nativeProps}
          ref={native}
          className="app-select-native"
          value={selected}
          disabled={disabled}
          required={required}
          autoFocus={false}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            if (value === undefined) setUncontrolledValue(event.target.value);
            setNativeInvalid(false);
            onChange?.(event);
          }}
          onInvalid={(event) => {
            nativeProps.onInvalid?.(event);
            event.preventDefault();
            setNativeInvalid(true);
            trigger.current?.focus();
          }}
        >
          {children}
        </select>
        {required && (
          <span className="app-select-sr-only" id={generatedId + '-required-hint'}>
            Campo obligatorio.
          </span>
        )}
      </AriaSelect>
      {nativeInvalid && (
        <small id={errorId} className="app-select-error" role="alert">
          Selecciona una opción.
        </small>
      )}
    </I18nProvider>
  );
}
