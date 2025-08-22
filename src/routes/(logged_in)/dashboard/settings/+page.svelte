<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import { currentUser, scrubinClient } from '@/scrubinClient/client';
	import type { PortalUser, Company, CompanyBilling } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { User, Phone, Mail, Asterisk, Building2, MapPin, Calendar } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { PUBLIC_ORIGIN } from '$env/static/public';
	import * as Select from '$lib/components/ui/select/index.js';
	import { t } from '$lib/i18n';

	interface Address {
		city: string;
		address: string;
		zipCode: string;
	}

	let user: PortalUser | null = $state(null);
	let companyProfile: Company | null = $state(null);

	let oldPassword = $state('');
	let newPassword = $state('');
	let repeatPassword = $state('');

	let isLoading = $state(true);
	let isSaving = $state(false);
	let isSavingPassword = $state(false);
	let isLoadingAdvertiser = $state(true);
	let isSavingCompany = $state(false);
	let countries = $state<string[]>([]);
	let billingInfo = $state<CompanyBilling | null>(null);

	onMount(async () => {
		try {
			const [userResult, advertiserResult, countriesResult, billingResult] = await Promise.all([
				Promise.resolve($currentUser),
				scrubinClient.company.getCompany(),
				scrubinClient.company.getCountries(),
				scrubinClient.company.getBilling()
			]);
			user = userResult;
			companyProfile = {
				...advertiserResult,
				address: advertiserResult.address || {
					city: '',
					address: '',
					zipCode: ''
				},
				brandName: advertiserResult.brandName || '',
				description: advertiserResult.description || ''
			};
			countries = countriesResult;
			billingInfo = billingResult;
		} catch (error) {
			console.error('Error fetching data:', error);
			toast.error('Failed to load details');
		} finally {
			isLoading = false;
			isLoadingAdvertiser = false;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSaving = true;
		if (!user) return;
		try {
			await scrubinClient.portal.updateUser({
				firstName: user.firstName,
				lastName: user.lastName,
				phoneNumber: user.phoneNumber,
				calendarLink: user.calendarLink
			});
			currentUser.set(user);
			toast.success($t('settings.notifications.settingsUpdated'));
		} catch (error) {
			console.error('Error updating user:', error);
			toast.error(
				error instanceof Error ? error.message : $t('settings.notifications.updateError')
			);
		} finally {
			isSaving = false;
		}
	}

	async function handleSubmitPassword(event: Event) {
		event.preventDefault();

		// Validate that new password and repeat password match
		if (newPassword !== repeatPassword) {
			toast.error($t('settings.notifications.passwordsDoNotMatch'));
			return;
		}

		isSavingPassword = true;
		try {
			await scrubinClient.portal.updatePassword({
				oldPassword: user?.passwordSet ? oldPassword.toString() : '',
				newPassword: newPassword.toString()
			});
			toast.success($t('settings.notifications.passwordUpdated'));
			oldPassword = '';
			newPassword = '';
			repeatPassword = '';
			user = await scrubinClient.portal.getUser();
		} catch (error) {
			console.error('Error updating password:', error);
			toast.error(
				error instanceof Error ? error.message : $t('settings.notifications.passwordUpdateError')
			);
		} finally {
			isSavingPassword = false;
		}
	}

	async function handleSubmitCompany(event: Event) {
		event.preventDefault();
		if (!companyProfile) return;
		isSavingCompany = true;
		try {
			await scrubinClient.company.updateCompany(companyProfile);
			toast.success($t('settings.notifications.settingsUpdated'));
		} catch (error) {
			console.error('Error updating:', error);
			toast.error(
				error instanceof Error ? error.message : $t('settings.notifications.updateError')
			);
		} finally {
			isSavingCompany = false;
		}
	}
</script>

<!-- <SEO
	title={$t('settings.title') + ' | Dashboard'}
	description={$t('settings.profile.description')}
	type="website"
/> -->

<div class="mx-auto w-full max-w-screen-xl space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-bold tracking-tight">{$t('settings.title')}</h2>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('settings.profile.title')}</Card.Title>
			<Card.Description>
				{$t('settings.profile.description')}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="flex h-32 items-center justify-center">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if user}
				<form onsubmit={handleSubmit} class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="firstName">{$t('settings.profile.firstName')}</Label>
							<div class="relative">
								<User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="firstName"
									bind:value={user.firstName}
									class="pl-9"
									placeholder={$t('settings.profile.firstNamePlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="lastName">{$t('settings.profile.lastName')}</Label>
							<div class="relative">
								<User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="lastName"
									bind:value={user.lastName}
									class="pl-9"
									placeholder={$t('settings.profile.lastNamePlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="email">{$t('settings.profile.email')}</Label>
							<div class="relative">
								<Mail class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input id="email" value={user.email} class="pl-9" disabled readonly />
							</div>
						</div>

						<div class="space-y-2">
							<Label for="phoneNumber">{$t('settings.profile.phoneNumber')}</Label>
							<div class="relative">
								<Phone class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="phoneNumber"
									bind:value={user.phoneNumber}
									class="pl-9"
									placeholder={$t('settings.profile.phoneNumberPlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="calendarLink">{$t('settings.profile.calendarLink')}</Label>
							<div class="relative">
								<Calendar class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="calendarLink"
									bind:value={user.calendarLink}
									class="pl-9"
									placeholder={$t('settings.profile.calendarLinkPlaceholder')}
								/>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<Button type="submit" disabled={isSaving}>
							{#if isSaving}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							{$t('settings.profile.saveChanges')}
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('settings.password.title')}</Card.Title>
			<Card.Description>
				{$t('settings.password.description')}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="flex h-32 items-center justify-center">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else}
				<form onsubmit={handleSubmitPassword} class="space-y-6">
					<div class="space-y-6">
						{#if user?.passwordSet}
							<div class="space-y-2">
								<Label for="oldPassword">{$t('settings.password.oldPassword')}</Label>
								<div class="relative">
									<Asterisk class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="oldPassword"
										bind:value={oldPassword}
										class="pl-9"
										placeholder={$t('settings.password.oldPasswordPlaceholder')}
										type="password"
									/>
								</div>
							</div>
						{/if}

						<div class="grid gap-6 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="newPassword">{$t('settings.password.newPassword')}</Label>
								<div class="relative">
									<Asterisk class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="newPassword"
										bind:value={newPassword}
										type="password"
										class="pl-9"
										placeholder={$t('settings.password.newPasswordPlaceholder')}
									/>
								</div>
							</div>

							<div class="space-y-2">
								<Label for="repeatPassword">{$t('settings.password.repeatPassword')}</Label>
								<div class="relative">
									<Asterisk class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="repeatPassword"
										bind:value={repeatPassword}
										type="password"
										class="pl-9"
										placeholder={$t('settings.password.repeatPasswordPlaceholder')}
									/>
								</div>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<Button type="submit" disabled={isSavingPassword}>
							{#if isSavingPassword}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							{$t('settings.password.updatePassword')}
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('settings.company.title')}</Card.Title>
			<Card.Description>
				{$t('settings.company.description')}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoadingAdvertiser}
				<div class="flex h-32 items-center justify-center">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if companyProfile}
				<form onsubmit={handleSubmitCompany} class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="brandName">{$t('settings.company.brandName')}</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="brandName"
									bind:value={companyProfile.brandName}
									class="pl-9"
									placeholder={$t('settings.company.brandNamePlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2 md:col-span-2">
							<Label for="description">{$t('settings.company.description')}</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="description"
									bind:value={companyProfile.description}
									class="pl-9"
									placeholder={$t('settings.company.descriptionPlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="companyLegalName">{$t('settings.company.companyName')}</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="companyLegalName"
									bind:value={companyProfile.companyLegalName}
									class="pl-9"
									placeholder={$t('settings.company.companyNamePlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="registrationCode">{$t('settings.company.registrationCode')}</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="registrationCode"
									bind:value={companyProfile.registrationCode}
									class="pl-9"
									placeholder={$t('settings.company.registrationCodePlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="vatNumber">{$t('settings.company.vatNumber')}</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="vatNumber"
									bind:value={companyProfile.vatNumber}
									class="pl-9"
									placeholder={$t('settings.company.vatNumberPlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="country">{$t('settings.company.country')}</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Select.Root
									disabled
									type="single"
									value={companyProfile?.country}
									onValueChange={(value) => {
										if (companyProfile) {
											companyProfile.country = value;
										}
									}}
								>
									<Select.Trigger class="w-full pl-9">
										{companyProfile?.country ?? $t('settings.company.countryPlaceholder')}
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
						</div>

						<div class="space-y-2">
							<Label for="city">{$t('settings.company.city')}</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="city"
									bind:value={companyProfile.address.city}
									class="pl-9"
									placeholder={$t('settings.company.cityPlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="address">{$t('settings.company.address')}</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="address"
									bind:value={companyProfile.address.address}
									class="pl-9"
									placeholder={$t('settings.company.addressPlaceholder')}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="zipCode">{$t('settings.company.zipCode')}</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="zipCode"
									bind:value={companyProfile.address.zipCode}
									class="pl-9"
									placeholder={$t('settings.company.zipCodePlaceholder')}
								/>
							</div>
						</div>
					</div>

					{#if billingInfo?.stripePaymentMethod && billingInfo?.stripePaymentMethod?.brand}
						<div class="mt-6 rounded-lg border bg-card p-4 shadow-sm">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-lg font-medium">{$t('settings.payment.title')}</h3>
							</div>
							<div class="flex items-center space-x-4">
								<div class="flex items-center justify-center rounded-md bg-muted p-2">
									<img
										src="/cards/{billingInfo.stripePaymentMethod.brand.toLowerCase()}.png"
										alt={billingInfo.stripePaymentMethod.brand}
										class="h-6 w-auto rounded-sm"
									/>
								</div>
								<div class="flex-1">
									<p class="flex items-center text-sm font-medium">
										{billingInfo.stripePaymentMethod.brand.toUpperCase()} •••• {billingInfo
											.stripePaymentMethod.last4Digits}
									</p>
									<p class="text-xs text-muted-foreground">
										{$t('settings.payment.expires')}
										{billingInfo.stripePaymentMethod.expirationMonth}/{billingInfo
											.stripePaymentMethod.expirationYear}
									</p>
								</div>
							</div>
						</div>
					{/if}

					<div class="flex justify-end">
						<Button type="submit" disabled={isSavingCompany}>
							{#if isSavingCompany}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							{$t('settings.company.save')}
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
