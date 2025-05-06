<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { t } from '$lib/i18n';

	let {
		projects = []
	}: {
		projects: {
			title: string;
			url: string;
			isActive?: boolean;
		}[];
	} = $props();
</script>

{#if projects.length > 0}
	<Sidebar.Group>
		<Sidebar.GroupLabel>{$t('nav.projects')}</Sidebar.GroupLabel>
		<Sidebar.Menu>
			{#each projects as project (project.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={project.isActive} href={project.url}>
						<span>{project.title}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Group>
{/if}
