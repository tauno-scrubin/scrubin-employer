import type { ScrubinClient } from '@/scrubinClient';
import type { PortalUser, Company } from '@/scrubinClient/types';

declare global {
	namespace App {
		interface Locals {
			scrubinClient: ScrubinClient;
			user: PortalUser | undefined;
			company: Company | undefined;
		}
	}
}

export {};
