import type { ContactBalances } from './contact-tools';
export type ContactOverview = {
  asOf: string;
  balances: ContactBalances;
  totals: { sales: string; purchases: string; pendingQuotes: number; drafts: number };
  advances: { receipt: string; payment: string };
  dueCount: number;
  dues: {
    id: string;
    documentId: string;
    number: string;
    description: string;
    dueDate: string;
    balance: string;
    direction: 'receipt' | 'payment';
  }[];
};
