export function PaginationControls({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number | null | undefined;
  onPage: (page: number) => void;
}) {
  if (!count || count <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
      <button className="btn btn-dark btn-sm" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}>Previous</button>
      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>
        Page {page} of {totalPages}
      </span>
      <button className="btn btn-dark btn-sm" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
    </div>
  );
}
