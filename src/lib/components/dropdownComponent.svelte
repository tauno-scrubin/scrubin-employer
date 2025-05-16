<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { cn } from '@/utils';


    let {
        options = $bindable([]),
        justString = $bindable(false),
        optionKey = $bindable(''),
        labelKey = $bindable(''),
        value = $bindable(''),
        onValueChange = $bindable(() => {}),
        placeholder = $bindable(''),
        disabled = $bindable(false),
        required = $bindable(false),
        showLabelInBrackets = $bindable(false),
        class: className = $bindable(''),
    } : {
        options: string[] | { [key: string]: any }[],
        value: string,
        justString?: boolean,
        optionKey: string,
        labelKey: string,
        onValueChange: (value: string) => void,
        placeholder?: string,
        disabled?: boolean,
        required?: boolean,
        class?: string,
        showLabelInBrackets?: boolean,
    } = $props()
</script>

<Select.Root
disabled={disabled}
required={required}
type="single"
value={value}
onValueChange={onValueChange}
>
<Select.Trigger class={cn(className)}>
    {#if justString}
        {value}
    {:else}
        {value ? options.find(option => option[optionKey] === value)?.[labelKey] : placeholder}
        {showLabelInBrackets ? '(' + options.find(option => option[optionKey] === value)?.[optionKey] + ')' : ''}
    {/if}
</Select.Trigger>
<Select.Content>
    <Select.Group>
        {#each options as option}
            {#if justString}
                <Select.Item value={option}>{option}</Select.Item>
            {:else}
                <Select.Item value={option[optionKey]}>{option[labelKey]} {showLabelInBrackets ? '(' + option[optionKey] + ')' : ''}</Select.Item>
            {/if}
        {/each}
    </Select.Group>
</Select.Content>
</Select.Root>