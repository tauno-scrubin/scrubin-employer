<script lang="ts">
	import { Alert } from '$lib/form';
	import ResetPasswordLink from '../reset-password-link.svelte';
	import { Button } from "$lib/components/ui/button";
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import ScrubinLogo from '@/components/scrubinLogo.svelte';

	export let form;
</script>

<div class="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-sm mb-8 text-center">
		<!-- Scrubin Logo -->
		<ScrubinLogo class="h-8 mx-auto mb-8" />
		<p class="text-muted-foreground mt-2">Enter your credentials to access your account</p>
	</div>

	<Card class="mx-auto w-full max-w-sm border-none shadow-none sm:border sm:shadow">
		<form method="POST" class="space-y-6">
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

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="password" class="text-sm font-medium">Password</Label>
						<ResetPasswordLink class="text-sm text-primary hover:text-primary/90" />
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						required
						placeholder="••••••••"
						class="shadow-sm"
					/>
				</div>

				{#if form?.errorMessage}
					<Alert variant="destructive">{form?.errorMessage}</Alert>
				{/if}

				<Button type="submit" class="w-full font-medium">
					Sign in
				</Button>
			</CardContent>

			<CardFooter class="flex justify-center border-t p-4">
				<p class="text-sm text-muted-foreground">
					Don't have an account?
					<a href="/sign-up" class="text-primary hover:text-primary/90">Sign up</a>
				</p>
			</CardFooter>
		</form>
	</Card>
</div>
