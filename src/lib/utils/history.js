const MAX_HISTORY = 20;

export function pushState(historyArr, index, imageData) {
	// Remove any states after current index (discard redo stack)
	const newHistory = historyArr.slice(0, index + 1);
	newHistory.push(imageData);

	// Limit history size
	if (newHistory.length > MAX_HISTORY) {
		newHistory.shift();
		return { history: newHistory, index: newHistory.length - 1 };
	}
	return { history: newHistory, index: newHistory.length - 1 };
}

export function undo(historyArr, index) {
	if (index > 0) {
		return { index: index - 1, imageData: historyArr[index - 1] };
	}
	return null;
}

export function redo(historyArr, index) {
	if (index < historyArr.length - 1) {
		return { index: index + 1, imageData: historyArr[index + 1] };
	}
	return null;
}
