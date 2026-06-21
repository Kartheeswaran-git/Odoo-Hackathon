export function PrintHeader({ company, title, number, date, partyLabel, partyName, partyAddress }) {
  const address = [company.address, company.city, company.state, company.pincode].filter(Boolean).join(', ');
  return <div className="print-only formal-print-header"><div className="formal-company"><h1>{company.company_name || 'Shiv Furniture Works'}</h1>{company.tagline && <p className="formal-tagline">{company.tagline}</p>}<p>{address || 'Registered business address'}</p><p>{[company.phone && `Phone: ${company.phone}`, company.email && `Email: ${company.email}`, company.website].filter(Boolean).join('  |  ')}</p><p>{[company.gstin && `GSTIN: ${company.gstin}`, company.pan && `PAN: ${company.pan}`].filter(Boolean).join('  |  ')}</p></div><h2>{title}</h2><div className="formal-meta"><div><strong>{partyLabel}</strong><span>{partyName || '—'}</span>{partyAddress && <span>{partyAddress}</span>}</div><div><p><strong>Document No:</strong> {number || 'Draft'}</p><p><strong>Date:</strong> {date || new Date().toLocaleDateString('en-IN')}</p><p><strong>Currency:</strong> {company.currency || 'INR'}</p></div></div></div>;
}

export function PrintFooter({ company }) {
  return <div className="print-only formal-print-footer"><div><strong>Terms & Conditions</strong><p>Goods once supplied are subject to the agreed business terms. Please quote the document number in all correspondence.</p><p>This is a computer-generated document.</p></div><div className="formal-signature"><p>For {company.company_name || 'Shiv Furniture Works'}</p><span>Authorised Signatory</span></div></div>;
}
