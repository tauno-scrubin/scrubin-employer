<script lang="ts">
    import type {
      init as baseInit,
      EChartsType as BaseEchartsType,
      EChartsOption,
      SetOptionOpts,
    } from 'echarts';
    import type { init as coreInit, EChartsType as CoreEchartsType } from 'echarts/core';
    import type { EChartsInitOpts } from 'echarts';
    import { onMount } from 'svelte';
    import { EVENT_NAMES, type EventHandlers } from './events';
    import { createEventDispatcher } from 'svelte';
  
    // Define the component's props interface.
    interface Props {
      init: typeof baseInit | typeof coreInit;
      theme: string | object | null;
      initOptions: EChartsInitOpts;
      options: EChartsOption;
      notMerge: SetOptionOpts['notMerge'];
      lazyUpdate: SetOptionOpts['lazyUpdate'];
      silent: SetOptionOpts['silent'];
      replaceMerge: SetOptionOpts['replaceMerge'];
      transition: SetOptionOpts['transition'];
      chart?: BaseEchartsType | CoreEchartsType;
    }
  
    // Unpack props using the new $props() rune.
    let {
      init,
      theme = 'light',
      initOptions = {},
      options,
      notMerge = true,
      lazyUpdate = false,
      silent = false,
      replaceMerge = undefined,
      transition = undefined,
      chart = undefined,
    }: Props = $props();
  
    // Declare a reactive reference for the chart container.
    let element: HTMLDivElement | null = $state(null);
  
    // Use $effect() to update chart options reactively.
    $effect(() => {
      if (chart) {
        chart.setOption(options, { notMerge, lazyUpdate, silent, replaceMerge, transition });
      }
    });
  
    // Add dispatcher
    const dispatch = createEventDispatcher<EventHandlers>();
  
    const initChart = () => {
      if (chart) chart.dispose();
  
      if (element) {
        chart = init(element, theme, initOptions);
      }
  
      // For each event, attach a listener that dispatches a native CustomEvent from the host.
      EVENT_NAMES.forEach((eventName) => {
        // @ts-expect-error (if necessary)
        chart!.on(eventName, (event) => {
          dispatch(eventName, event);
        });
      });
    };
  
    onMount(() => {
      const resizeObserver = new ResizeObserver(() => {
        if (!chart) initChart();
        else chart.resize();
      });
      if (element) resizeObserver.observe(element);
  
      return () => {
        resizeObserver.disconnect();
        chart?.dispose();
      };
    });
  </script>
  
  <!-- Note: The spread of $$restProps has been removed to avoid TypeScript errors -->
  <div bind:this={element} style="width: 100%; height: 100%"></div>
  