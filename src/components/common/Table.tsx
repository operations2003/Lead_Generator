import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './LoadingState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (columnKey: string) => void;
  keyExtractor: (row: T) => string;
}

export function Table<T>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  pagination,
  onSort,
  keyExtractor,
}: TableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={pagination?.limit || 5} cols={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const startRecord = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const endRecord = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : data.length;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>{col.header}</span>
                  {col.sortable && <ArrowUpDown size={12} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="table-pagination">
          <div>
            Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{startRecord}</span> to{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{endRecord}</span> of{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pagination.total}</span> entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              style={{ opacity: pagination.page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ padding: '0 0.5rem', fontWeight: 600 }}>
              {pagination.page} / {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              style={{ opacity: pagination.page >= totalPages ? 0.5 : 1 }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
