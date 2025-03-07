<script lang="ts">
	import type { Requirements } from "@/scrubinClient";
	import { ChartArea, Clock } from "lucide-svelte";
    
    
    let {
        hiringPlan,
    } : {
        hiringPlan: Requirements['hiringPlan']
    } = $props();


    function formatDemand(demand: number) {
        // Scale 1-10 (eg, low, medium, high, very high)
        if (demand < 3) return 'Low';
        if (demand < 6) return 'Medium';
        if (demand < 8) return 'High';
        return 'Very high';
    }


</script>

<div class="flex flex-col gap-2 mb-4">
<!-- Demand -->
<div class="flex flex-col gap-1 p-4 bg-gradient-to-b from-neutral-50/50 via-white to-neutral-50/50 shadow-inner shadow-white rounded-md  border">
    <ChartArea class="w-4 h-4 text-blue-500" />
    <p class="text-sm font-medium text-primary">Overall hiring demand</p>
    <p class="text-sm text-gray-500">{formatDemand(hiringPlan.hiringDemand)}</p>
</div>

<!-- Minimum period -->
<div class="flex flex-col gap-1 p-4 bg-gradient-to-b from-neutral-50 via-white to-neutral-50 shadow-inner shadow-white rounded-md  border">
    <Clock class="w-4 h-4 text-blue-500" />
    <p class="text-sm font-medium text-primary">Estimated time to fill</p>
    <p class="text-sm text-gray-500">{hiringPlan.hiringMinimumPeriodInMonths} months</p>
</div>

</div>