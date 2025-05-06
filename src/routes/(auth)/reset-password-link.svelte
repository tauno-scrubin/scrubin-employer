<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { t } from '$lib/i18n';
	// Use let class as any to bypass the type error
	let className = '';
	export { className as class };
</script>

<div class="text-center">
	<Button variant="link" href="/reset-password" class="m-0 p-0 text-xs">
		{$t('auth.resetPassword.forgotPassword')}
	</Button>
</div>
