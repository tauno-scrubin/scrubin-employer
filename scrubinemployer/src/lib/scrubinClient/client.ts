

import { PUBLIC_API_URL } from '$env/static/public';
import { writable, type Writable } from 'svelte/store';
import { ScrubinClient, type PortalUser } from './index';

export const scrubinClient = new ScrubinClient(PUBLIC_API_URL);

export const currentUser: Writable<PortalUser | null> = writable(null);


