import type { ViewState } from '../view-state';
export interface UrlState { write(view: Readonly<ViewState>): void }
