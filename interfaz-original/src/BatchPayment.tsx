import { PaymentCreation } from './PaymentCreation';

export function BatchPayment(props: { onClose: () => void; onSaved: () => void }) {
  return <PaymentCreation {...props} />;
}
