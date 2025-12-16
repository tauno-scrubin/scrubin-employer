<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Bold,
		Italic,
		Heading2,
		List,
		ListOrdered,
		Link as LinkIcon,
		Code
	} from 'lucide-svelte';

	interface MarkdownToolbarProps {
		onBold: () => void;
		onItalic: () => void;
		onHeading: () => void;
		onUnorderedList: () => void;
		onOrderedList: () => void;
		onLink: () => void;
		onCode: () => void;
	}

	let {
		onBold,
		onItalic,
		onHeading,
		onUnorderedList,
		onOrderedList,
		onLink,
		onCode
	}: MarkdownToolbarProps = $props();
</script>

<div class="flex flex-wrap gap-1 rounded-md border border-gray-200 bg-gray-50 p-2">
	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onBold}
		class="h-8 w-8 p-0"
		title="Bold (Ctrl+B)"
	>
		<Bold class="h-4 w-4" />
	</Button>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onItalic}
		class="h-8 w-8 p-0"
		title="Italic (Ctrl+I)"
	>
		<Italic class="h-4 w-4" />
	</Button>

	<div class="mx-1 w-px bg-gray-300"></div>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onHeading}
		class="h-8 w-8 p-0"
		title="Heading"
	>
		<Heading2 class="h-4 w-4" />
	</Button>

	<div class="mx-1 w-px bg-gray-300"></div>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onUnorderedList}
		class="h-8 w-8 p-0"
		title="Bullet List"
	>
		<List class="h-4 w-4" />
	</Button>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onOrderedList}
		class="h-8 w-8 p-0"
		title="Numbered List"
	>
		<ListOrdered class="h-4 w-4" />
	</Button>

	<div class="mx-1 w-px bg-gray-300"></div>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onLink}
		class="h-8 w-8 p-0"
		title="Insert Link"
	>
		<LinkIcon class="h-4 w-4" />
	</Button>

	<Button
		type="button"
		variant="ghost"
		size="sm"
		onclick={onCode}
		class="h-8 w-8 p-0"
		title="Inline Code"
	>
		<Code class="h-4 w-4" />
	</Button>
</div>
