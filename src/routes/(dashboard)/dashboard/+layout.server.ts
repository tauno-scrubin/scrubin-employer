import { PUBLIC_API_URL } from '$env/static/public';
import { redirect } from '@sveltejs/kit';
export async function load({ locals, url }) {
	if (!locals.user) redirect(302, '/login' + url.search);
}