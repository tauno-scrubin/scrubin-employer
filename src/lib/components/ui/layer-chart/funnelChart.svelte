<script lang="ts">
    import Chart from './index.svelte';
    import { init, use } from 'echarts/core';
    import { FunnelChart } from 'echarts/charts';
    import { 
        GridComponent, 
        TitleComponent, 
        TooltipComponent, 
        LegendComponent 
    } from 'echarts/components';
    import { CanvasRenderer } from 'echarts/renderers';

    // Register necessary components
    use([FunnelChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent, LegendComponent]);

    let { 
        data = $bindable([]), 
        colors = $bindable(['#38bdf8', '#818cf8', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']),
        title = $bindable(''),
        height = $bindable('300px')
    }: { 
        data: Array<{name: string, value: number, percentage?: string}>,
        colors?: string[],
        title?: string,
        height?: string
    } = $props();

    // Process data to ensure it has percentages
    let processedData = $derived(processData());
    
    function processData() {
        if (!data || data.length === 0) return [];
        
        // If percentages are not provided, calculate them
        if (!data[0].percentage) {
            const maxValue = Math.max(...data.map(item => item.value));
            return data.map((item, index) => ({
                ...item,
                percentage: ((item.value / maxValue) * 100).toFixed(2) + '%',
                itemStyle: { color: colors[index % colors.length] }
            }));
        }
        
        // If percentages are already provided, just add colors
        return data.map((item, index) => ({
            ...item,
            itemStyle: { color: colors[index % colors.length] }
        }));
    }

    // Force chart to re-render when options change
    let chartKey = $state(0)
    $effect(() => {
        // This will trigger a re-render of the chart component
        chartKey = Math.random();
    });

    let options = $derived(getOptions());
    
    function getOptions() {
        if (!data || data.length === 0) return {};
        
        return {
            series: [
                {
                    type: 'funnel',
                    orient: 'horizontal',
                    funnelAlign: 'center',
                    sort: 'none',
                    gap: 2,
                    width: '90%',
                    height: '80%',
                    maxSize: '100%',
                    smooth: true,
                    smoothRatio: 1.5,
                    minSize: '0%',
                    left: '5%',
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: '{b}: {c}',
                        fontSize: 12,
                        color: '#fff'
                    },
                       // Curvature of the links (0~1)
          lineStyle: {
            curveness: 0.9
          },
          emphasis: {
            focus: 'adjacency'
          },
                    data: processedData
                }
            ]
        };
    }
</script>

<div style="height: {height}">
    {#if data && data.length > 0}
        <Chart {init} {options} key={chartKey} />
    {:else}
        <div class="flex items-center justify-center h-full bg-muted rounded-md">
            <p class="text-muted-foreground">No data available</p>
        </div>
    {/if}
</div> 