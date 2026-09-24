import { useRemote } from './components';
import { invoiceHints } from '../shared/invoice-assist';
import { contactTaxIdSchema } from '../shared/contacts';
import type { CustomerHistory } from '../shared/sales-tools';
import type { DocumentInput } from '../shared/domain';

type AssistProps = { data: DocumentInput; currentId?: string };

export function SalesCreationAssist(props: AssistProps) {
  const identity = contactTaxIdSchema.safeParse(props.data.party.taxId);
  return identity.success ? (
    <CustomerAssist key={identity.data} {...props} customer={identity.data} />
  ) : null;
}

function CustomerAssist({ data: input, currentId, customer }: AssistProps & { customer: string }) {
  const { data } = useRemote<CustomerHistory>(
    '/sales/customer-context?customer=' + encodeURIComponent(customer),
  );
  const hints = data ? invoiceHints(input, data, currentId) : null;
  if (!hints?.duplicate && !hints?.free) return null;
  return (
    <div className="sales-creation-assist">
      {hints?.duplicate && (
        <p role="status">
          Ya hay un documento de este cliente con la misma fecha e importe:{' '}
          <a href={'#document/' + hints.duplicate.id} target="_blank" rel="noreferrer">
            {hints.duplicate.number || 'Borrador'} (abre otra pestaña)
          </a>
          . Revisa si corresponde a otra operación.
        </p>
      )}
      {!!hints?.free && (
        <p role="status">
          {hints.free === 1
            ? 'Hay un concepto con precio 0 €.'
            : `Hay ${hints.free} conceptos con precio 0 €.`}
        </p>
      )}
    </div>
  );
}
