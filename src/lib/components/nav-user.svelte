<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { locale, t } from '$lib/i18n';
	import { availableLanguages } from '$lib/i18n/config';
	import { changeLanguage } from '$lib/utils/languageUtils';
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
	import Globe from 'lucide-svelte/icons/globe';
	import LogOut from 'lucide-svelte/icons/log-out';

	let {
		user
	}: {
		user: {
			name: string;
			email: string;
			avatar: string;
		};
	} = $props();

	const sidebar = useSidebar();

	function handleLogout() {
		goto('/logout');
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">CN</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{user.name}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">CN</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{user.name}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />

				<!-- Language selection -->
				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger>
						<Globe class="mr-2 h-4 w-4" />
						<span>{$t(`languages.${$locale}`)}</span>
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						{#each availableLanguages as loc}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<div on:click={() => changeLanguage(loc)} role="menuitem" tabindex="0">
								<DropdownMenu.Item class={$locale === loc ? 'bg-accent' : ''}>
									{$t(`languages.${loc}`)}
								</DropdownMenu.Item>
							</div>
						{/each}
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>

				<DropdownMenu.Separator />
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<div on:click={handleLogout} role="menuitem" tabindex="0">
					<DropdownMenu.Item>
						<LogOut />
						{$t('nav.logout')}
					</DropdownMenu.Item>
				</div>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
