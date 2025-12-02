<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';
	import { visible } from '@/components/dashboard/overlay';

	onMount(async () => {
		visible.set(true);
		try {
			const requirementId = parseInt(page.params.id);

			// Check if this requirement has an active hunt
			const session = await scrubinClient.hunt.getRequirementChatResult(requirementId);

			// If it's complete and has a hunt, redirect to the hunt page
			// Otherwise, redirect to the create/edit page
			if (session.isComplete) {
				// Try to find the associated hunt
				try {
					const hunts = await scrubinClient.hunt.getHunts({ page: 0, size: 100 });
					const associatedHunt = hunts.items.find(h => h.title === session.currentRequirements.jobTitle);

					if (associatedHunt && associatedHunt.status !== 'PENDING') {
						// Redirect to the active hunt
						goto(`/dashboard/hunts/${associatedHunt.huntId}`);
						return;
					}
				} catch (e) {
					console.error('Error finding hunt:', e);
				}
			}

			// If we get here, it's a draft - redirect to create page
			goto(`/dashboard/hunts/requirements/${requirementId}/create`);
		} catch (error) {
			console.error('Error loading requirement:', error);
			// If requirement doesn't exist, go back to hunts
			goto('/dashboard/hunts');
		} finally {
			visible.set(false);
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<!-- Loading state handled by overlay -->
</div>
