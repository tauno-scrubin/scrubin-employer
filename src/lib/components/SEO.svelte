<script lang="ts">

interface Props {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    type?: string;
    canonicalUrl?: string;
  }

  let { 
    title,
    description,
    keywords,
    image,
    type = "website",
    canonicalUrl = ""
  }: Props = $props();
 
</script>

<svelte:head>
  {#if title}
    <title>{title}</title>
    <meta name="twitter:title" content={title} />
    <meta property="og:title" content={title} />
  {/if}

  {#if description}
    <meta name="description" content={description} />
    <meta property="og:description" content={description} />
    <meta name="twitter:description" content={description} />
  {/if}

  <meta name="keywords" content={keywords} />
  <meta property="og:type" content={type} />


  {#if image}
    <meta property="og:image" content={image} />
    <meta name="twitter:image" content={image} />
    <meta name="twitter:card" content="summary_large_image" />
  {/if}

  {#if canonicalUrl}
    <link rel="canonical" href={canonicalUrl} />
  {/if}
</svelte:head> 