export interface PageRequest {
  /** 1-based page number. */
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  /** Total matching items, across all pages. */
  total: number;
}
