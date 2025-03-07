<script lang="ts">
	import type { Requirements } from "@/scrubinClient";
	import { ChartArea, Clock, Bot, Users, CheckCircle2, Globe } from "lucide-svelte";
	import { getCurrencySymbol } from "../payment/payments";
    
    let {
        hiringPlan,
    } : {
        hiringPlan: Requirements['hiringPlan']
    } = $props();

    const features = [
        {
            icon: Clock,
            title: "24/7 Operation",
            description: "Continuous outreach without manual intervention"
        },
        {
            icon: Globe,
            title: "Timezone Intelligence",
            description: "Analyzes user timezones for optimal engagement"
        },
        {
            icon: Bot,
            title: "AI-Powered Personalization",
            description: "Tailored messages based on candidate profiles"
        },
        {
            icon: Users,
            title: "Automated Engagement",
            description: "Maximizes response rates through smart timing"
        }
    ];
</script>

<div class="flex flex-col gap-4 p-5 from-neutral-50/50 via-white to-neutral-50/50 shadow-inner shadow-white rounded-lg  mb-4 border">
    <div>
        <h2 class="text-lg font-medium text-primary">AI Recruitment Automation</h2>
        <p class="text-sm text-muted-foreground">Once activated, our AI Agent automatically sends personalized job offers to candidates when they're most likely to respond.</p>
    </div>

    <div class="flex items-baseline gap-1 mt-1">
        <span class="text-2xl font-semibold">{hiringPlan?.hiringInitialPriceForOneCandidate?.amount} {getCurrencySymbol(hiringPlan?.hiringInitialPriceForOneCandidate?.currency || 'EUR')}</span>
        <span class="text-sm text-muted-foreground">/month</span>
    </div>

    <div class="grid gap-3 mt-1">
        {#each features as feature}
            <div class="flex items-start gap-2">
                <feature.icon class="w-4 h-4  mt-0.5 text-blue-500" />
                <div>
                    <h3 class="text-sm font-medium">{feature.title}</h3>
                    <p class="text-xs text-muted-foreground">{feature.description}</p>
                </div>
            </div>
        {/each}
    </div>

    <p class="text-xs text-muted-foreground mt-2">
        Activate to automate recruitment while you focus on evaluating qualified candidates.
    </p>
</div>