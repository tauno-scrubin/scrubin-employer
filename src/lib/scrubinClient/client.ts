

import { PUBLIC_API_URL } from '$env/static/public';
import { writable, type Writable } from 'svelte/store';
import { ScrubinClient, type PortalUser, type Company } from './index';

export const scrubinClient = new ScrubinClient(PUBLIC_API_URL);

export const currentUser: Writable<PortalUser | null> = writable(null);
export const currentUserCompany: Writable<Company | null> = writable(null);

