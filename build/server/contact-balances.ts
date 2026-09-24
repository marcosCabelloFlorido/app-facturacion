// Fiscal identity is shared with contact activity; never match a mutable display name.
export const contactIdentity = (alias: string, parameter: string) =>
  `upper(regexp_replace(${alias}.party->>'taxId', '[[:space:].-]', '', 'g'))=${parameter}`;
export const receiptDocument = `(d.kind='invoice' OR (d.kind='credit' AND d.credit_side='purchase'))`;
export const contactBalancesSql = (identity: string) => `
  SELECT coalesce(sum(d.balance) FILTER (WHERE d.status IN ('issued','recorded') AND ${receiptDocument}),0)::text AS receivable,
    coalesce(sum(d.balance) FILTER (WHERE d.status IN ('issued','recorded') AND NOT ${receiptDocument}),0)::text AS payable,
    coalesce(sum(v.overdue) FILTER (WHERE d.status IN ('issued','recorded') AND ${receiptDocument}),0)::text AS overdue_receivable,
    coalesce(sum(v.overdue) FILTER (WHERE d.status IN ('issued','recorded') AND NOT ${receiptDocument}),0)::text AS overdue_payable,
    min(v.next_due) FILTER (WHERE d.status IN ('issued','recorded') AND d.balance>0) AS next_due,
    greatest(max(d.date),
      (SELECT max(greatest(p.date,p.reversal_date)) FROM payments p JOIN documents pdoc ON pdoc.id=p.document_id WHERE ${contactIdentity('pdoc', identity)}),
      (SELECT max(f.date) FROM unapplied_funds f WHERE ${contactIdentity('f', identity)}),
      (SELECT max(a.date) FROM fund_applications a JOIN unapplied_funds f ON f.id=a.fund_id WHERE ${contactIdentity('f', identity)})
    ) AS last_activity
  FROM document_balances d
  LEFT JOIN LATERAL (SELECT sum(balance) FILTER (WHERE due_date<CURRENT_DATE) AS overdue,
    min(due_date) FILTER (WHERE balance>0) AS next_due
    FROM document_due_balances WHERE document_id=d.id AND balance>0) v ON true
  WHERE ${contactIdentity('d', identity)}
`;
export const contactOrderSql = {
  name_asc: `lower(data->>'name'),contacts.id`,
  name_desc: `lower(data->>'name') DESC,contacts.id`,
  receivable_desc: `totals.receivable::numeric DESC,lower(data->>'name'),contacts.id`,
  payable_desc: `totals.payable::numeric DESC,lower(data->>'name'),contacts.id`,
  due_asc: `totals.next_due ASC NULLS LAST,lower(data->>'name'),contacts.id`,
  activity_desc: `totals.last_activity DESC NULLS LAST,lower(data->>'name'),contacts.id`,
};
