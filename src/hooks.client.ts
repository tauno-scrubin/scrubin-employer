
import { scrubinClient } from '@/scrubinClient/client';

scrubinClient.authStore.loadFromCookie(document.cookie);

// remove token from url
const url = new URL(window.location.href);
url.searchParams.delete('token');
window.history.replaceState({}, '', url.toString());
