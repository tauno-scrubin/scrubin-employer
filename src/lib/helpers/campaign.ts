export function getColorByStatus(status: string) {
    //DRAFT, ACTIVE, PAUSED, COMPLETED
    switch (status) {
        case 'DRAFT':
            return 'bg-gray-100 text-gray-800';
        case 'ACTIVE':
            return 'bg-green-100 text-green-800';
        case 'PAUSED':
            return 'bg-yellow-100 text-yellow-800';
        case 'COMPLETED':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}