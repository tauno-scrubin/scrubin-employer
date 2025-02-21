import type { ScrubinClient } from '@/scrubinClient';
import type { PortalUser } from '@/scrubinClient/types';

declare global {
	namespace App {
		interface Locals {
			scrubinClient: ScrubinClient;
			user: PortalUser | undefined;
		}
	}
}

export {};
