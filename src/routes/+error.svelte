<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { AlertTriangle, Home, ArrowLeft } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	$: error = page.error;
	$: status = page.status;

	function getErrorMessage(status: number): { title: string; description: string } {
		switch (status) {
			case 404:
				return {
					title: 'Page Not Found',
					description: 'The page you are looking for does not exist or has been moved.'
				};
			case 403:
				return {
					title: 'Access Forbidden',
					description: 'You do not have permission to access this resource.'
				};
			case 500:
				return {
					title: 'Internal Server Error',
					description: 'Something went wrong on our end. Please try again later.'
				};
			default:
				return {
					title: 'An Error Occurred',
					description: 'Something unexpected happened. Please try again.'
				};
		}
	}

	$: errorInfo = getErrorMessage(status);

	function handleGoBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			goto('/dashboard');
		}
	}

	function handleGoHome() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Error {status} - Scrubin</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
			>
				<AlertTriangle class="h-6 w-6 text-destructive" />
			</div>
			<CardTitle class="text-2xl font-bold text-foreground">
				{status}
			</CardTitle>
			<h2 class="text-lg font-semibold text-foreground">
				{errorInfo.title}
			</h2>
		</CardHeader>
		<CardContent class="space-y-6 text-center">
			<p class="text-muted-foreground">
				{errorInfo.description}
			</p>

			{#if error?.message && status !== 404}
				<div class="rounded-md bg-muted p-3 text-sm text-muted-foreground">
					<strong>Details:</strong>
					{error.message}
				</div>
			{/if}

			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				<Button variant="outline" onclick={handleGoBack} class="flex items-center gap-2">
					<ArrowLeft class="h-4 w-4" />
					Go Back
				</Button>
				<Button onclick={handleGoHome} class="flex items-center gap-2">
					<Home class="h-4 w-4" />
					Go to Dashboard
				</Button>
			</div>

			{#if status === 404}
				<div class="text-xs text-muted-foreground">
					If you believe this page should exist, please contact support.
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
