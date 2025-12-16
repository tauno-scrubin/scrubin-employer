import showdown from 'showdown';
import TurndownService from 'turndown';

// Showdown converter for Markdown to HTML
const showdownConverter = new showdown.Converter({
	omitExtraWLInCodeBlocks: true,
	noHeaderId: true,
	parseImgDimensions: true,
	simplifiedAutoLink: true,
	literalMidWordUnderscores: true,
	strikethrough: true,
	tables: true,
	tasklists: true,
	ghCodeBlocks: true,
	smoothLivePreview: true,
	simpleLineBreaks: false,
	openLinksInNewWindow: false,
	emoji: true,
	underline: true
});

// Turndown service for HTML to Markdown
const turndownService = new TurndownService({
	headingStyle: 'atx',
	hr: '---',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	emDelimiter: '*'
});

/**
 * Convert markdown text to HTML
 */
export function markdownToHtml(markdown: string): string {
	if (!markdown) return '';
	return showdownConverter.makeHtml(markdown);
}

/**
 * Convert HTML to markdown text
 */
export function htmlToMarkdown(html: string): string {
	if (!html) return '';
	return turndownService.turndown(html);
}

/**
 * Get the current selection and its container
 */
function getSelectionInfo() {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	return { selection, range };
}

/**
 * Wrap the current selection with HTML tags
 */
function wrapSelection(tag: string, attributes: Record<string, string> = {}) {
	const info = getSelectionInfo();
	if (!info) return;

	const { selection, range } = info;
	const selectedText = range.toString();

	// Create wrapper element
	const wrapper = document.createElement(tag);
	Object.entries(attributes).forEach(([key, value]) => {
		wrapper.setAttribute(key, value);
	});

	// Handle empty selection
	if (selectedText.length === 0) {
		wrapper.textContent = tag === 'a' ? 'link text' : 'text';
		range.insertNode(wrapper);

		// Select the placeholder text
		const newRange = document.createRange();
		newRange.selectNodeContents(wrapper);
		selection.removeAllRanges();
		selection.addRange(newRange);
	} else {
		// Wrap selected content
		try {
			range.surroundContents(wrapper);
		} catch (e) {
			// If surroundContents fails (e.g., partial element selection),
			// extract contents and wrap them
			const fragment = range.extractContents();
			wrapper.appendChild(fragment);
			range.insertNode(wrapper);
		}
	}
}

/**
 * Toggle bold formatting
 */
export function toggleBold(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { selection, range } = info;

	// Check if selection is already bold
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const boldParent = (node as HTMLElement).closest('strong, b');
	if (boldParent) {
		// Remove bold
		const text = boldParent.textContent || '';
		const textNode = document.createTextNode(text);
		boldParent.parentNode?.replaceChild(textNode, boldParent);
	} else {
		// Add bold
		wrapSelection('strong');
	}
}

/**
 * Toggle italic formatting
 */
export function toggleItalic(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { selection, range } = info;

	// Check if selection is already italic
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const italicParent = (node as HTMLElement).closest('em, i');
	if (italicParent) {
		// Remove italic
		const text = italicParent.textContent || '';
		const textNode = document.createTextNode(text);
		italicParent.parentNode?.replaceChild(textNode, italicParent);
	} else {
		// Add italic
		wrapSelection('em');
	}
}

/**
 * Insert or toggle heading
 */
export function toggleHeading(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { selection, range } = info;

	// Find the block element containing the selection
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	// Check if we're in a heading
	const headingParent = (node as HTMLElement).closest('h1, h2, h3, h4, h5, h6');

	if (headingParent && headingParent.parentElement === editor) {
		// Convert heading to paragraph
		const p = document.createElement('p');
		p.innerHTML = headingParent.innerHTML;
		headingParent.parentNode?.replaceChild(p, headingParent);

		// Restore cursor position
		const newRange = document.createRange();
		newRange.selectNodeContents(p);
		newRange.collapse(false);
		selection.removeAllRanges();
		selection.addRange(newRange);
	} else if (!headingParent) {
		// Find the closest block element, but make sure it's not the editor itself
		let blockParent = (node as HTMLElement).closest('p, div, li');

		// If no block parent found, or if it's the editor itself, wrap selection in h2
		if (!blockParent || blockParent === editor || !editor.contains(blockParent.parentElement)) {
			// Just wrap the current selection text
			const selectedText = range.toString() || 'Heading';
			const h2 = document.createElement('h2');
			h2.textContent = selectedText;

			if (selectedText) {
				range.deleteContents();
			}
			range.insertNode(h2);

			// Place cursor after heading
			const newRange = document.createRange();
			newRange.selectNodeContents(h2);
			newRange.collapse(false);
			selection.removeAllRanges();
			selection.addRange(newRange);
		} else if (blockParent.parentElement === editor) {
			// Convert block to h2
			const h2 = document.createElement('h2');
			h2.innerHTML = blockParent.innerHTML;
			blockParent.parentNode?.replaceChild(h2, blockParent);

			// Restore cursor position
			const newRange = document.createRange();
			newRange.selectNodeContents(h2);
			newRange.collapse(false);
			selection.removeAllRanges();
			selection.addRange(newRange);
		}
	}
}

/**
 * Insert unordered list
 */
export function insertUnorderedList(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { range } = info;

	// Check if we're already in a list
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const listParent = (node as HTMLElement).closest('ul');

	if (listParent && listParent.parentElement === editor) {
		// Remove list formatting - convert to paragraphs
		const items = Array.from(listParent.querySelectorAll('li'));
		const fragment = document.createDocumentFragment();

		items.forEach((li) => {
			const p = document.createElement('p');
			p.innerHTML = li.innerHTML;
			fragment.appendChild(p);
		});

		listParent.parentNode?.replaceChild(fragment, listParent);
	} else if (!listParent) {
		// Create new list
		const ul = document.createElement('ul');
		const li = document.createElement('li');

		const selectedText = range.toString();
		li.textContent = selectedText || 'List item';
		ul.appendChild(li);

		range.deleteContents();
		range.insertNode(ul);

		// Place cursor in the list item
		const newRange = document.createRange();
		newRange.selectNodeContents(li);
		newRange.collapse(false);

		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(newRange);
	}
}

/**
 * Insert ordered list
 */
export function insertOrderedList(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { range } = info;

	// Check if we're already in a list
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const listParent = (node as HTMLElement).closest('ol');

	if (listParent && listParent.parentElement === editor) {
		// Remove list formatting - convert to paragraphs
		const items = Array.from(listParent.querySelectorAll('li'));
		const fragment = document.createDocumentFragment();

		items.forEach((li) => {
			const p = document.createElement('p');
			p.innerHTML = li.innerHTML;
			fragment.appendChild(p);
		});

		listParent.parentNode?.replaceChild(fragment, listParent);
	} else if (!listParent) {
		// Create new list
		const ol = document.createElement('ol');
		const li = document.createElement('li');

		const selectedText = range.toString();
		li.textContent = selectedText || 'List item';
		ol.appendChild(li);

		range.deleteContents();
		range.insertNode(ol);

		// Place cursor in the list item
		const newRange = document.createRange();
		newRange.selectNodeContents(li);
		newRange.collapse(false);

		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(newRange);
	}
}

/**
 * Insert link
 */
export function insertLink(editor: HTMLElement, url?: string) {
	editor.focus();

	if (!url) {
		const promptResult = window.prompt('Enter URL:');
		if (!promptResult) return;
		url = promptResult;
	}

	// Add protocol if missing
	if (url && !url.match(/^https?:\/\//i)) {
		url = 'https://' + url;
	}

	const info = getSelectionInfo();
	if (!info) return;

	const { range } = info;

	// Check if we're already in a link
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const linkParent = (node as HTMLElement).closest('a');

	if (linkParent) {
		// Update existing link
		linkParent.setAttribute('href', url);
	} else {
		// Create new link
		wrapSelection('a', { href: url });
	}
}

/**
 * Insert inline code
 */
export function insertCode(editor: HTMLElement) {
	editor.focus();
	const info = getSelectionInfo();
	if (!info) return;

	const { range } = info;

	// Check if we're already in code
	let node = range.commonAncestorContainer;
	if (node.nodeType === Node.TEXT_NODE) {
		node = node.parentElement!;
	}

	const codeParent = (node as HTMLElement).closest('code');

	if (codeParent && codeParent.parentElement?.tagName !== 'PRE') {
		// Remove code formatting
		const text = codeParent.textContent || '';
		const textNode = document.createTextNode(text);
		codeParent.parentNode?.replaceChild(textNode, codeParent);
	} else {
		// Add code formatting
		wrapSelection('code');
	}
}

/**
 * Setup keyboard shortcuts for the editor
 */
export function setupKeyboardShortcuts(
	editor: HTMLElement,
	handlers: {
		onBold: () => void;
		onItalic: () => void;
	}
) {
	const handleKeyDown = (e: KeyboardEvent) => {
		// Ctrl/Cmd + B for bold
		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault();
			handlers.onBold();
		}

		// Ctrl/Cmd + I for italic
		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault();
			handlers.onItalic();
		}

		// Handle Enter key in lists
		if (e.key === 'Enter') {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0) return;

			const range = selection.getRangeAt(0);
			let node = range.commonAncestorContainer;

			if (node.nodeType === Node.TEXT_NODE) {
				node = node.parentElement!;
			}

			// Check if we're in a list item
			const listItem = (node as HTMLElement).closest('li');
			if (listItem) {
				const list = listItem.parentElement;
				if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
					// Check if the list item is empty
					if (listItem.textContent?.trim() === '') {
						// Exit the list
						e.preventDefault();
						const p = document.createElement('p');
						p.innerHTML = '<br>';
						list.parentNode?.insertBefore(p, list.nextSibling);

						// Move cursor to the new paragraph
						const newRange = document.createRange();
						newRange.setStart(p, 0);
						newRange.collapse(true);
						selection.removeAllRanges();
						selection.addRange(newRange);

						// Remove empty list item
						listItem.remove();

						// If list is now empty, remove it
						if (list.children.length === 0) {
							list.remove();
						}
					} else {
						// Create new list item
						e.preventDefault();
						const newLi = document.createElement('li');
						newLi.innerHTML = '<br>';

						// Insert after current item
						listItem.parentNode?.insertBefore(newLi, listItem.nextSibling);

						// Move cursor to new list item
						const newRange = document.createRange();
						newRange.setStart(newLi, 0);
						newRange.collapse(true);
						selection.removeAllRanges();
						selection.addRange(newRange);
					}
				}
			}
		}
	};

	editor.addEventListener('keydown', handleKeyDown);

	// Return cleanup function
	return () => {
		editor.removeEventListener('keydown', handleKeyDown);
	};
}
