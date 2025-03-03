<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import { onMount } from "svelte";
	import { currentUser, scrubinClient } from "@/scrubinClient/client";
	import type { PortalUser, Company, CompanyBilling } from "@/scrubinClient";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { User, Phone, Mail, Asterisk, Building2, MapPin, Calendar } from "lucide-svelte";
	import { toast } from "svelte-sonner";
	import { PUBLIC_ORIGIN } from "$env/static/public";
	import * as Select from "$lib/components/ui/select/index.js";


	let user: PortalUser | null = $state(null);
	let companyProfile: Company | null = $state(null);

	let oldPassword = $state('');
	let newPassword = $state('');

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
			companyProfile = advertiserResult;
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

	async function handleSubmit() {
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
			toast.success('Settings updated successfully');
		} catch (error) {
			console.error('Error updating user:', error);
			toast.error( error instanceof Error ? error.message : 'Failed to update user settings');
		} finally {
			isSaving = false;
		}
	}

	async function handleSubmitPassword() {
		isSavingPassword = true;
		try {
			await scrubinClient.portal.updatePassword({
				oldPassword: oldPassword.toString(),
				newPassword: newPassword.toString()
			});
			toast.success('Password updated successfully');
			oldPassword = '';
			newPassword = '';
		} catch (error) {
			console.error('Error updating password:', error);
			toast.error( error instanceof Error ? error.message : 'Failed to update password');
		} finally {
			isSavingPassword = false;
		}
	}

	async function handleSubmitAdvertiser() {
		if (!companyProfile) return;
		isSavingCompany = true;
		try {
			await scrubinClient.company.updateCompany(companyProfile);
			toast.success('Settings updated successfully');
		} catch (error) {
			console.error('Error updating:', error);
			toast.error( error instanceof Error ? error.message : 'Failed to update settings');
		} finally {
			isSavingCompany = false;
		}
	}
</script>

<SEO 
	title="Settings | Dashboard"
	description="User settings and preferences"
	type="website"
/>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-bold tracking-tight">Settings</h2>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Profile Settings</Card.Title>
			<Card.Description>
				Manage your account settings and preferences
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="flex justify-center items-center h-32">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else}
				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="firstName">First Name</Label>
							<div class="relative">
								<User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="firstName"
									bind:value={user.firstName}
									class="pl-9"
									placeholder="Enter your first name"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="lastName">Last Name</Label>
							<div class="relative">
								<User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="lastName"
									bind:value={user.lastName}
									class="pl-9"
									placeholder="Enter your last name"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="email">Email</Label>
							<div class="relative">
								<Mail class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="email"
									value={user.email}
									class="pl-9"
									disabled
									readonly
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="phoneNumber">Phone Number</Label>
							<div class="relative">
								<Phone class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="phoneNumber"
									bind:value={user.phoneNumber}
									class="pl-9"
									placeholder="Enter your phone number"
								/>
							</div>
						</div>


						<div class="space-y-2">
							<Label for="calendarLink">Calendar Link</Label>
							<div class="relative">
								<Calendar class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="calendarLink"
									bind:value={user.calendarLink}
									class="pl-9"
									placeholder="Enter your calendar link (e.g. google calendar, cal.com, calendly )"
								/>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<Button type="submit" disabled={isSaving}>
							{#if isSaving}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							Save Changes
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Password Settings</Card.Title>
			<Card.Description>
				Manage your account password
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoading}
				<div class="flex justify-center items-center h-32">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else}
				<form on:submit|preventDefault={handleSubmitPassword} class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="oldPassword">Old Password</Label>
							<div class="relative">
								<Asterisk class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="oldPassword"
									bind:value={oldPassword}
									class="pl-9"
									placeholder="Enter your old password"
									type="password"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="newPassword">New Password</Label>
							<div class="relative">
								<Asterisk class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="newPassword"
									bind:value={newPassword}
									type="password"
									class="pl-9"
									placeholder="Enter your new password"
								/>
							</div>
						</div>
					</div>

					<div class="flex justify-end">
						<Button type="submit" disabled={isSavingPassword}>
							{#if isSavingPassword}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							Update Password
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Company Settings</Card.Title>
			<Card.Description>
				Manage your company profile and business details
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoadingAdvertiser}
				<div class="flex justify-center items-center h-32">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{:else if companyProfile}
				<form on:submit|preventDefault={handleSubmitAdvertiser} class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="companyLegalName">Company Name</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="companyLegalName"
									bind:value={companyProfile.companyLegalName}
									class="pl-9"
									placeholder="Enter company name"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="registrationCode">Registration Code</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="registrationCode"
									bind:value={companyProfile.registrationCode}
									class="pl-9"
									placeholder="Enter registration code"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="vatNumber">VAT Number</Label>
							<div class="relative">
								<Building2 class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="vatNumber"
									bind:value={companyProfile.vatNumber}
									class="pl-9"
									placeholder="Enter VAT number"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="country">Country</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Select.Root type="single"
									value={companyProfile.country} 
									onValueChange={(value) => companyProfile.country = value}
								>
									<Select.Trigger class="w-full pl-9">
									{companyProfile.country ? companyProfile.country : 'Select a country'}
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
							<Label for="city">City</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="city"
									bind:value={companyProfile.address.city}
									class="pl-9"
									placeholder="Enter city"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="address">Address</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="address"
									bind:value={companyProfile.address.address}
									class="pl-9"
									placeholder="Enter street address"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="zipCode">ZIP Code</Label>
							<div class="relative">
								<MapPin class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="zipCode"
									bind:value={companyProfile.address.zipCode}
									class="pl-9"
									placeholder="Enter ZIP code"
								/>
							</div>
						</div>
					</div>

					<!-- {#if billingInfo?.stripePaymentMethod && billingInfo.stripePaymentMethod.brand}
						<div class="mt-6 border rounded-lg p-4">
							<h3 class="text-lg font-medium mb-3">Payment Method</h3>
							<div class="flex items-center space-x-4">
								<div class="flex-1">
									<p class="text-sm font-medium">
										{billingInfo.stripePaymentMethod.brand.toUpperCase()} ending in {billingInfo.stripePaymentMethod.last4Digits}
									</p>
									<p class="text-sm text-muted-foreground">
										Expires {billingInfo.stripePaymentMethod.expirationMonth}/{billingInfo.stripePaymentMethod.expirationYear}
									</p>
								</div>
								<Button variant="outline" type="button" onclick={() => window.open(`${PUBLIC_ORIGIN}/billing`, '_blank')}>
									Manage Payment
								</Button>
							</div>
						</div>
					{/if} -->

					<div class="flex justify-end">
						<Button type="submit" disabled={isSavingCompany}>
							{#if isSavingCompany}
								<span class="loading loading-spinner loading-sm mr-2"></span>
							{/if}
							Save
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
