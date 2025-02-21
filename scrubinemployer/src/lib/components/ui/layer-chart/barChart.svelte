<script lang="ts">

    import Chart from './index.svelte'
    import { init, use } from 'echarts/core'
    import { BarChart } from 'echarts/charts'
    import { GridComponent, TitleComponent, TooltipComponent} from 'echarts/components'
    import { CanvasRenderer } from 'echarts/renderers'

    let { byDay = $bindable(), color = $bindable('#3b82f6') }
    : { byDay: { date: string, count: number }[], color: string } 
    = $props();
  
    // now with tree-shaking
    use([BarChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent])
  
    // Fill in missing dates and get counts for the last 7 days

    let options = $derived(getOptions());
    function getOptions() {
        // Find min and max dates from the data
        const dates = byDay.map(item => new Date(item.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Create arrays to hold the complete timeline
        const timelineDates = [];
        const counts = [];
        
        // Create a map of existing dates to their counts
        const dateMap = new Map(
            byDay.map(item => [item.date, item.count])
        );
        
        // Generate dates from min to max
        const currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            timelineDates.push(dateStr);
            counts.push(dateMap.get(dateStr) || 0);
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            grid: {
                top: 10,
                right: 10,
                bottom: 24,
                left: 2,
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: timelineDates,
                axisLabel: {
                    formatter: (value: string) => {
                        const date = new Date(value);
                        const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff <= 14) {
                            // Show weekday for ranges up to 14 days
                            return date.toLocaleDateString('en-US', { weekday: 'short' });
                        } else if (daysDiff <= 31) {
                            // Show date and month for ranges up to a month
                            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                        } else {
                            // Show only month for longer ranges
                            return date.toLocaleDateString('en-US', { month: 'short' });
                        }
                    },
                    interval: (timelineDates.length > 14) ? Math.floor(timelineDates.length / 7) : 0
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params: any) {
                    const date = new Date(params[0].name).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    return `${date}<br/>Count: ${params[0].value}`;
                }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                axisTick: {
                    show: false
                }
            },
            series: [
                {
                    type: 'bar',
                    data: counts,
                    itemStyle: {
                        color: color
                    }
                }
            ]
        }
    };

</script>
  
<div class="h-52">
    {#if byDay && byDay.length > 0}
        <Chart {init} {options}  />
    {:else}
        <div class="flex items-center justify-center h-full bg-muted rounded-md">
            <p class="text-muted-foreground">No data available</p>
        </div>
    {/if}
</div>
  