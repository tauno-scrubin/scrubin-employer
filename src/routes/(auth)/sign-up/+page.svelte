<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Alert } from '$lib/components/ui/alert';
	import ScrubinLogo from '@/components/scrubinLogo.svelte';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { t } from '$lib/i18n';
	import LanguageSelector from '$lib/components/ui/language-selector.svelte';

	let {
		form
	}: {
		form: {
			errorMessage: string;
		};
	} = $props();

	let countries = $state<string[]>([]);
	let selectedCountry = $state<string>('');

	onMount(async () => {
		try {
			countries = await scrubinClient.company.getCountries();
		} catch (error) {
			toast.error('Error fetching countries');
			console.error('Error fetching countries:', error);
		}
	});
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="mb-8 text-center sm:mx-auto sm:w-full sm:max-w-sm">
		<div class="mb-4 flex flex-col items-center">
			<ScrubinLogo class="mb-1 h-8" />
			<span class="text-xs font-medium">{$t('auth.employer')}</span>
		</div>
		<p class="mt-2 text-muted-foreground">{$t('auth.signUp.title')}</p>
	</div>

	<Card class="mx-auto w-full max-w-sm border-none shadow-none sm:border sm:shadow">
		<form method="POST" class="space-y-2">
			<CardContent class="space-y-4 pt-6">
				<div class="space-y-2">
					<Label for="email" class="text-sm font-medium">{$t('auth.signUp.emailLabel')}</Label>
					<Input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						placeholder={$t('auth.signUp.emailPlaceholder')}
						class="shadow-sm"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName" class="text-sm font-medium"
							>{$t('auth.signUp.firstNameLabel')}</Label
						>
						<Input
							id="firstName"
							name="firstName"
							type="text"
							required
							placeholder={$t('auth.signUp.firstNamePlaceholder')}
							class="shadow-sm"
						/>
					</div>
					<div class="space-y-2">
						<Label for="lastName" class="text-sm font-medium"
							>{$t('auth.signUp.lastNameLabel')}</Label
						>
						<Input
							id="lastName"
							name="lastName"
							type="text"
							required
							placeholder={$t('auth.signUp.lastNamePlaceholder')}
							class="shadow-sm"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="phone" class="text-sm font-medium">{$t('auth.signUp.phoneLabel')}</Label>
					<Input
						id="phone"
						name="phone"
						type="tel"
						required
						placeholder={$t('auth.signUp.phonePlaceholder')}
						class="shadow-sm"
					/>
				</div>

				<div class="space-y-2">
					<Label for="companyName" class="text-sm font-medium"
						>{$t('auth.signUp.companyNameLabel')}</Label
					>
					<Input
						id="companyName"
						name="companyName"
						type="text"
						required
						placeholder={$t('auth.signUp.companyNamePlaceholder')}
						class="shadow-sm"
					/>
				</div>

				<div class="space-y-2">
					<Label for="country" class="text-sm font-medium">{$t('auth.signUp.countryLabel')}</Label>
					<Select.Root
						name="country"
						type="single"
						value={selectedCountry}
						onValueChange={(value) => (selectedCountry = value)}
					>
						<Select.Trigger class="w-full shadow-sm">
							<span>{selectedCountry || $t('auth.signUp.countryPlaceholder')}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each countries as country}
									<Select.Item value={country}>{country}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				{#if form?.errorMessage}
					<Alert variant="destructive">{form?.errorMessage}</Alert>
				{/if}

				<Button type="submit" class="w-full font-medium">{$t('buttons.signUp')}</Button>

				<p class="text-sm text-muted-foreground">
					{$t('auth.signUp.agreement')}
					<a
						href="https://scrubin.io/terms-and-conditions"
						class="text-primary hover:text-primary/90">{$t('auth.signUp.termsOfService')}</a
					>
					{$t('auth.signUp.and')}
					<a href="https://scrubin.io/privacy-policy" class="text-primary hover:text-primary/90"
						>{$t('auth.signUp.privacyPolicy')}</a
					>.
				</p>
			</CardContent>

			<CardFooter class="flex flex-col gap-4 border-t p-4">
				<p class="text-sm text-muted-foreground">
					{$t('auth.signUp.haveAccount')}
					<a href="/login" class="text-primary hover:text-primary/90">{$t('auth.signUp.signIn')}</a>
				</p>
				<div class="flex justify-center">
					<LanguageSelector variant="ghost" />
				</div>
			</CardFooter>
		</form>
	</Card>
</div>
