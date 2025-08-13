<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils.js';
	import { Check, ChevronsUpDown } from 'lucide-svelte';

	interface ComboboxItem {
		value: string;
		label: string;
	}

	interface ComboboxProps {
		items: ComboboxItem[];
		values?: string[];
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		disabled?: boolean;
		class?: string;
		onValuesChange?: (values: string[]) => void;
	}

	let {
		items,
		values = $bindable(),
		placeholder = 'Select options...',
		searchPlaceholder = 'Search...',
		emptyText = 'No results found.',
		disabled = false,
		class: className,
		onValuesChange
	}: ComboboxProps = $props();

	let open = $state(false);

	let selectedLabels = $derived(
		(items ?? [])
			.filter((item) => (values ?? []).includes(item.value))
			.map((item) => item.label)
			.join(', ')
	);

	function toggleItem(itemValue: string) {
		const current = values ?? [];
		const updated = current.includes(itemValue)
			? current.filter((v) => v !== itemValue)
			: [...current, itemValue];
		values = updated;
		onValuesChange?.(updated);
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger
		class={cn(
			'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{disabled}
	>
		<span class="truncate">{(values?.length ?? 0) > 0 ? selectedLabels : placeholder}</span>
		<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
	</Popover.Trigger>
	<Popover.Content class="w-full p-0" align="start">
		<Command.Root shouldFilter={true}>
			<Command.Input placeholder={searchPlaceholder} />
			<Command.Empty>{emptyText}</Command.Empty>
			<Command.List class="max-h-[200px] overflow-auto">
				<Command.Group>
					{#each items as item (item.value)}
						<Command.Item
							value={item.label}
							onSelect={() => toggleItem(item.value)}
							class="cursor-pointer"
						>
							{item.label}
							<Check
								class={cn(
									'ml-auto h-4 w-4',
									(values ?? []).includes(item.value) ? 'opacity-100' : 'opacity-0'
								)}
							/>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
