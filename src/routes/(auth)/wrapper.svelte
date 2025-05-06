<script lang="ts">
	import { t } from '$lib/i18n';
	export let title: string;
</script>

<h2
	class="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
>
	{title}
</h2>

<div class="text-center text-black dark:text-white">
	<slot name="altaction">
		{$t('auth.wrapper.or')}
		<a class="cursor-pointer text-indigo-500 hover:underline" href="/login"
			>{$t('auth.wrapper.login')}</a
		>
	</slot>
</div>

<div class="mt-10">
	<form class="space-y-6" method="POST">
		<slot />
	</form>
</div>
