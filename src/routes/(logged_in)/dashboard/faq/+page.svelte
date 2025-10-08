<script lang="ts">
  import { t } from '$lib/i18n';

  const items = [
    { q: 'faq.q1', a: 'faq.a1' },
    { q: 'faq.q2', a: 'faq.a2' },
    { q: 'faq.q3', a: 'faq.a3' },
    { q: 'faq.q4', a: 'faq.a4' },
    { q: 'faq.q5', a: 'faq.a5' },
    { q: 'faq.q6', a: 'faq.a6' },
    { q: 'faq.q7', a: 'faq.a7' }
  ] as const;

  const pRange = Array.from({ length: 10 }, (_, i) => i + 1);
</script>

<section class="mx-auto max-w-3xl px-6 py-8">
  <h1 class="mb-8 text-2xl font-semibold tracking-tight">{$t('faq.title')}</h1>

  <div class="space-y-8">
    {#each items as item, i}
      <article class="space-y-3">
        <h2 class="text-lg font-medium">
          {i + 1}. {$t(item.q)}
        </h2>

        {#each pRange as n}
          {#if $t(`${item.a}.p${n}`) !== `${item.a}.p${n}`}
            <p class="text-sm leading-6 text-muted-foreground">{$t(`${item.a}.p${n}`)}</p>
          {/if}
        {/each}
      </article>
    {/each}
  </div>
</section>
