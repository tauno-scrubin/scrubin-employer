<script lang="ts">
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import LanguageSelector from '$lib/components/ui/language-selector.svelte';
	import { t } from '$lib/i18n';
	import ScrubinLogo from '@/components/scrubinLogo.svelte';

	export let form;
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="mb-8 text-center sm:mx-auto sm:w-full sm:max-w-sm">
		<!-- Scrubin Logo -->
		<div class="mb-4 flex flex-col items-center">
			<ScrubinLogo class="mb-1 h-8" />
			<span class="text-xs font-medium">{$t('auth.employer')}</span>
		</div>
	</div>

	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>{$t('auth.resetPassword.title')}</CardTitle>
			<CardDescription>
				{$t('auth.resetPassword.description')}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" class="grid gap-4">
				<div class="grid gap-2">
					<Label for="email">{$t('auth.resetPassword.emailLabel')}</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder={$t('auth.resetPassword.emailPlaceholder')}
						required
						autocomplete="email"
					/>
				</div>

				{#if form?.message}
					<Alert variant="success">
						<AlertDescription>{form.message}</AlertDescription>
					</Alert>
				{/if}

				<Button type="submit" class="w-full">{$t('buttons.sendResetLink')}</Button>

				<div class="text-center">
					<Button variant="link" href="/login" class="text-primary">
						{$t('buttons.backToLogin')}
					</Button>
				</div>
			</form>
		</CardContent>
		<CardFooter class="flex justify-center border-t p-4">
			<LanguageSelector variant="ghost" />
		</CardFooter>
	</Card>
</div>
