export function load({ locals }) {
	if (locals.user) {
		return {
			user: locals.user,
			company: locals.company
		};
	}

	return { user: undefined };
}
