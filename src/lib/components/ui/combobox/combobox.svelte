<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils.js';
	import { Check, ChevronDown } from 'lucide-svelte';

	interface ComboboxItem {
		value: string;
		label: string;
	}

	interface ComboboxProps {
		items: ComboboxItem[];
		value?: string;
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		disabled?: boolean;
		class?: string;
		onValueChange?: (value: string | undefined) => void;
	}

	let {
		items,
		value = $bindable(),
		placeholder = 'Select item...',
		searchPlaceholder = 'Search...',
		emptyText = 'No results found.',
		disabled = false,
		class: className,
		onValueChange
	}: ComboboxProps = $props();

	let open = $state(false);

	let selectedItem = $derived(items.find((item) => item.value === value));

	function selectItem(itemValue: string) {
		const newValue = value === itemValue ? undefined : itemValue;
		value = newValue;
		onValueChange?.(newValue);
		open = false;
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger
		class={cn(
			'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{disabled}
	>
		{selectedItem?.label ?? placeholder}
		<ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
							onSelect={() => selectItem(item.value)}
							class="cursor-pointer"
						>
							<Check
								class={cn('mr-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')}
							/>
							{item.label}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
