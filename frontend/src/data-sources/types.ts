export interface DataSourceColumn<TItem> {
  key: string;
  label: string;
  getValue: (item: TItem) => string;
}

export interface DataSourceAdapter<TItem> {
  id: string;
  name: string;
  listKey: string;
  listFetcher: () => Promise<TItem[]>;
  detailKey: (id: string | number) => readonly [string, string];
  detailFetcher: (id: string | number) => Promise<TItem>;
  getItemId: (item: TItem) => string;
  getTimestamp?: (item: TItem) => string | null;
  columns: readonly DataSourceColumn<TItem>[];
  searchableFields: readonly string[];
  filters?: readonly string[];
}
