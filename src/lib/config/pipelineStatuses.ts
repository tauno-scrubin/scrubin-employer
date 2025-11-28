import {
	UserPlus,
	UserCog,
	Users,
	UserCheck,
	FileText,
	CheckCircle2,
	UserMinus,
	type Icon
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

export interface PipelineStatusConfig {
	value: string;
	translationKey: string;
	icon: ComponentType<Icon>;
	color: string;
}

export const PIPELINE_STATUS_CONFIGS: PipelineStatusConfig[] = [
	{
		value: 'interested',
		translationKey: 'statistics.pipelineStatuses.interested.label',
		icon: UserPlus,
		color: 'bg-blue-100 text-blue-800'
	},
	{
		value: 'under_review',
		translationKey: 'statistics.pipelineStatuses.under_review.label',
		icon: UserCog,
		color: 'bg-indigo-100 text-indigo-800'
	},
	{
		value: 'meeting_scheduled',
		translationKey: 'statistics.pipelineStatuses.meeting_scheduled.label',
		icon: Users,
		color: 'bg-purple-100 text-purple-800'
	},
	{
		value: 'screening_completed',
		translationKey: 'statistics.pipelineStatuses.screening_completed.label',
		icon: UserCheck,
		color: 'bg-cyan-100 text-cyan-800'
	},
	{
		value: 'offer_made',
		translationKey: 'statistics.pipelineStatuses.offer_made.label',
		icon: FileText,
		color: 'bg-yellow-100 text-yellow-800'
	},
	{
		value: 'accepted',
		translationKey: 'statistics.pipelineStatuses.accepted.label',
		icon: CheckCircle2,
		color: 'bg-green-100 text-green-800'
	},
	{
		value: 'declined',
		translationKey: 'statistics.pipelineStatuses.declined.label',
		icon: UserMinus,
		color: 'bg-red-100 text-red-800'
	}
];

/**
 * Get status configuration by value
 * Maps 'hired' to 'accepted' for backwards compatibility
 */
export function getStatusConfig(status: string): PipelineStatusConfig | undefined {
	const normalizedStatus = status.toLowerCase() === 'hired' ? 'accepted' : status.toLowerCase();
	return PIPELINE_STATUS_CONFIGS.find((s) => s.value === normalizedStatus);
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
	return getStatusConfig(status)?.color || 'bg-gray-100 text-gray-800';
}
