import { PaymentCreation } from './PaymentCreation';

export function SalesBatchPayment(props: { onClose: () => void; onSaved: () => void }) {
  return <PaymentCreation salesOnly {...props} />;
}
