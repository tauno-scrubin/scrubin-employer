<script lang="ts">
	import { Alert } from '$lib/form';
	import ResetPasswordLink from '../reset-password-link.svelte';
	import { Button } from "$lib/components/ui/button";
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import ScrubinLogo from '@/components/scrubinLogo.svelte';
	import * as Select from "$lib/components/ui/select/index.js";
	import { scrubinClient } from "@/scrubinClient/client";
	import { onMount } from "svelte";
	import { toast } from 'svelte-sonner';

	let {
		form
	}: {
		form: {
			errorMessage: string;
		}
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
	<div class="sm:mx-auto sm:w-full sm:max-w-sm mb-8 text-center">
		<!-- Add your logo here -->
		<ScrubinLogo class="h-8 mx-auto mb-8" />
		<p class="text-muted-foreground mt-2">Enter your details to sign up</p>
	</div>

	<Card class="mx-auto w-full max-w-sm border-none shadow-none sm:border sm:shadow">
		<form method="POST" class="space-y-2">
			<CardContent class="space-y-4 pt-6">
				<div class="space-y-2">
					<Label for="email" class="text-sm font-medium">Email address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						placeholder="name@example.com"
						class="shadow-sm"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName" class="text-sm font-medium">First name</Label>
						<Input
							id="firstName"
							name="firstName"
							type="text"
							required
							placeholder="John"
							class="shadow-sm"
						/>
					</div>
					<div class="space-y-2">
						<Label for="lastName" class="text-sm font-medium">Last name</Label>
						<Input
							id="lastName"
							name="lastName"
							type="text"
							required
							placeholder="Doe"
							class="shadow-sm"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="phone" class="text-sm font-medium">Phone number</Label>
					<Input
						id="phone"
						name="phone"
						type="tel"
						required
						placeholder="+1234567890"
						class="shadow-sm"
					/>
				</div>

				<div class="space-y-2">
					<Label for="companyName" class="text-sm font-medium">Company name</Label>
					<Input
						id="companyName"
						name="companyName"
						type="text"
						required
						placeholder="Acme Inc."
						class="shadow-sm"
					/>
				</div>

				<div class="space-y-2">
					<Label for="country" class="text-sm font-medium">Country</Label>
					<Select.Root name="country" value={selectedCountry} onValueChange={(value) => selectedCountry = value}>
						<Select.Trigger class="w-full shadow-sm">
							<span>{selectedCountry || 'Select a country'}</span>
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

				<Button type="submit" class="w-full font-medium">
					Sign up
				</Button>

				<p class="text-sm text-muted-foreground">
					By creating an account, you agree to our
					<a href="https://scrubin.io/terms-and-conditions" class="text-primary hover:text-primary/90">Terms of Service</a>
					and
					<a href="https://scrubin.io/privacy-policy" class="text-primary hover:text-primary/90">Privacy Policy</a>.
				</p>
			</CardContent>

			<CardFooter class="flex justify-center border-t p-4">
				<p class="text-sm text-muted-foreground">
					Already have an account?
					<a href="/login" class="text-primary hover:text-primary/90">Sign in</a>
				</p>
			</CardFooter>
		</form>
	</Card>
</div>
