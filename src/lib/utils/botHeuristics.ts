/**
 * How long the outreach splash withholds its CTA. The button is not rendered at all until this
 * elapses, so automation that clicks everything present on load finds nothing to click — which
 * matters because requiring a trusted event is not enough on its own: a CDP-driven click
 * (Playwright, Puppeteer, most email-sandbox harnesses) dispatches a *trusted* event.
 */
export const OUTREACH_REVEAL_DELAY_SECONDS = 5;

/**
 * Client-side signals that the environment is automated (headless scanners, prerenderers).
 * Safe to call only in the browser.
 *
 * A backstop, not the gate: modern detonation sandboxes drive real Chrome and pass every check here.
 * The redeem is protected by the delayed-reveal CTA plus a trusted click.
 */
export function detectAutomation(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
	if (navigator.webdriver === true) return true;
	if (!navigator.languages || navigator.languages.length === 0) return true;
	if (window.outerWidth === 0 || window.outerHeight === 0) return true;
	if ('prerendering' in document && (document as { prerendering?: boolean }).prerendering) {
		return true;
	}
	return false;
}
