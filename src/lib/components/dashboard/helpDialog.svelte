<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import { Mail, Phone, MessageSquare, Calendar, Video, Send } from "lucide-svelte";
    import { ScrubinClient, type Feedback } from "$lib/scrubinClient";
    import { PUBLIC_API_URL } from "$env/static/public";
    import { onMount } from "svelte";
	import { scrubinClient } from "@/scrubinClient/client";
	import Button from "../ui/button/button.svelte";

    let {
        open = $bindable(),
    } : {
        open: boolean;
    } = $props();

    let accountManager = $state({
        name: "Tarmo Korela",
        email: "tarmo@scrubin.io",
        phone: "+372 5787 3185",
        avatar: "/avatar/tarmo.jpeg",
        calendar: "https://calendar.app.google/VN4kA74b4Xjn6tHN7"
    });

    // Feedback state
    let feedbackContent = $state("");
    let isSending = $state(false);
    let sendSuccess = $state(false);
    let sendError = $state<string | null>(null);

    async function submitFeedback() {
        isSending = true;
        sendSuccess = false;
        sendError = null;
        try {
            await scrubinClient.portal.submitFeedback({ content: feedbackContent });
            sendSuccess = true;
            feedbackContent = "";
        } catch (e) {
            sendError = e instanceof Error ? e.message : "Failed to send feedback";
        } finally {
            isSending = false;
        }
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title class="text-xl font-semibold">Need Assistance?</Dialog.Title>
            <Dialog.Description class="text-sm text-gray-500">
                Contact your dedicated account manager
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="flex flex-col gap-6 py-4">
            <div class="flex items-start gap-4">
                <Avatar.Root class="h-16 w-16">
                    <Avatar.Image src={accountManager.avatar} alt={accountManager.name} class="h-full w-full object-cover" />
                    <Avatar.Fallback class="text-lg">{accountManager.name.split(' ').map(n => n[0]).join('')}</Avatar.Fallback>
                </Avatar.Root>
                
                <div class="flex-1 space-y-4">
                    <div>
                        <h2 class="text-lg font-medium">{accountManager.name}</h2>
                        <p class="text-sm text-gray-500">Account Manager</p>
                    </div>
                    
                    <div class="space-y-2">
                        <a href={`mailto:${accountManager.email}`} class="flex items-center gap-2 text-sm group">
                            <Mail class="h-4 w-4 text-gray-500" />
                            <span class="group-hover:text-blue-600 group-hover:underline">{accountManager.email}</span>
                        </a>
                        
                        <a href={`tel:${accountManager.phone}`} class="flex items-center gap-2 text-sm group">
                            <Phone class="h-4 w-4 text-gray-500" />
                            <span class="group-hover:text-blue-600 group-hover:underline">{accountManager.phone}</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 mt-2">
                <a href={`mailto:${accountManager.email}`} class="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Mail class="h-5 w-5 text-blue-600 mb-1" />
                    <span class="text-xs">Message</span>
                </a>
                <a href={`tel:${accountManager.phone}`} class="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Phone class="h-5 w-5 text-blue-600 mb-1" />
                    <span class="text-xs">Call</span>
                </a>
                <a href={accountManager.calendar} target="_blank" class="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Calendar class="h-5 w-5 text-blue-600 mb-1" />
                    <span class="text-xs">Schedule</span>
                </a>
            </div>
        </div>

        <!-- Feedback Section -->
        <div class="mt-4 border-t pt-4">
            <h3 class="text-base font-medium mb-2 flex items-center gap-2">
                <MessageSquare class="h-4 w-4" /> Send Feedback
            </h3>
            <form on:submit|preventDefault={submitFeedback} class="flex flex-col gap-2">
                <textarea
                    class="border rounded-md p-2 text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Let us know how we can improve or help you…"
                    bind:value={feedbackContent}
                    required
                    rows={3}
                    disabled={isSending}
                />
                <div class="flex items-center gap-2">
                    <Button
                        type="submit"
                        disabled={isSending || !feedbackContent.trim()}
                    >
                        <Send class="h-4 w-4" />
                        {isSending ? "Sending…" : "Send"}
                    </Button>
                    {#if sendSuccess}
                        <span class="text-green-600 text-xs">Thank you for your feedback!</span>
                    {/if}
                    {#if sendError}
                        <span class="text-red-600 text-xs">{sendError}</span>
                    {/if}
                </div>
            </form>
        </div>
    </Dialog.Content>
</Dialog.Root>