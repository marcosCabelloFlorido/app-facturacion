import { Select } from './Select';
export const settingsGroups = [
  { value: 'business', label: 'Empresa', items: ['workspaces', 'company'] },
  {
    value: 'documents',
    label: 'Documentos',
    items: ['billing', 'series', 'buyer-policies', 'templates'],
  },
  { value: 'operations', label: 'Operativa', items: ['portal', 'imports'] },
  {
    value: 'account',
    label: 'Cuenta y seguridad',
    items: ['profile', 'users', 'audit'],
  },
];
export function settingsSections(admin: boolean) {
  return [
    ['workspaces', 'Empresa'],
    ['company', 'Datos de empresa'],
    ['billing', 'Facturación'],
    ...(admin
      ? [
          ['series', 'Series de numeración'],
          ['buyer-policies', 'Requisitos del comprador'],
        ]
      : []),
    ['templates', 'Plantillas'],
    ...(admin ? [['portal', 'Portal del cliente']] : []),
    ['imports', 'Importaciones'],
    ...(admin ? [['users', 'Usuarios y permisos']] : []),
    ['profile', 'Perfil'],
    ...(admin ? [['audit', 'Registro de auditoría']] : []),
  ].map(([value, label]) => ({ value, label }));
}

export function SettingsNavigation({
  section,
  sections,
  onNavigate,
}: {
  section: string;
  sections: { value: string; label: string }[];
  onNavigate: (value: string) => void;
}) {
  return (
    <aside className="settings-side-navigation">
      <nav
        className="settings-side-desktop settings-side-group"
        aria-label="Apartados de configuración"
      >
        <ul>
          {sections.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                data-settings-target={item.value}
                aria-current={section === item.value ? 'page' : undefined}
                onClick={() => onNavigate(item.value)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="settings-side-mobile">
        <Select
          aria-label="Apartado de configuración"
          value={section}
          onChange={(event) => onNavigate(event.target.value)}
        >
          {sections.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    </aside>
  );
}
