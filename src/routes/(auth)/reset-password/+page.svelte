<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Alert, AlertDescription } from "$lib/components/ui/alert";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import Wrapper from '../wrapper.svelte';

	export let form;
</script>

<div class="container flex items-center justify-center min-h-[600px] sm:min-h-screen py-8">
	<Card class="w-full max-w-md">
		<CardHeader>
			<CardTitle>Reset password</CardTitle>
			<CardDescription>
				We'll send you an email with a link to reset your password.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" class="grid gap-4">
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="name@example.com"
						required
						autocomplete="email"
					/>
				</div>

				{#if form?.message}
					<Alert variant="success">
						<AlertDescription>{form.message}</AlertDescription>
					</Alert>
				{/if}

				<Button type="submit" class="w-full">Send reset link</Button>

				<div class="text-center">
					<Button variant="link" href="/login" class="text-primary">
						Back to login
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
